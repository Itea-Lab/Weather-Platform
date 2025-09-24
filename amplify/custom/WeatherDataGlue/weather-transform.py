import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql import DataFrame
from pyspark.sql.functions import *
from pyspark.sql.types import *
import boto3
from datetime import datetime

# Get job parameters
args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'source-bucket',
    'target-bucket', 
    'database-name'
])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Parameters
source_bucket = args['source_bucket']
target_bucket = args['target_bucket']
database_name = args['database_name']

try:
    # Read data from Glue Catalog
    datasource = glueContext.create_dynamic_frame.from_catalog(
        database=database_name,
        table_name="telemetry"
    )
    
    # Convert to Spark DataFrame
    df = datasource.toDF()
    
    # Transform the data
    # Extract nested fields and flatten the structure
    transformed_df = df.select(
        col("timestamp"),
        col("location"),
        col("data.temperature").alias("temperature"),
        col("data.humidity").alias("humidity"), 
        col("data.pressure").alias("pressure"),
        col("data.winddirection").alias("wind_direction"),
        col("data.avgwindspeed").alias("avg_wind_speed"),
        col("data.maxwindspeed").alias("max_wind_speed"),
        col("data.rainfall1hr").alias("rainfall_1hr"),
        col("data.rainfall24hr").alias("rainfall_24hr")
    ).filter(
        col("timestamp").isNotNull() & 
        col("location").isNotNull()
    )
    
    # Get unique locations
    locations = transformed_df.select("location").distinct().collect()
    
    # Process each location separately - ALL historical data per location
    for location_row in locations:
        location = location_row["location"]
        
        # Filter data for this location
        location_df = transformed_df.filter(col("location") == location)
        
        # Sort by timestamp to have chronological order
        location_df = location_df.orderBy("timestamp")
        
        # Select final columns
        final_df = location_df.select(
            "timestamp",
            "location", 
            "temperature",
            "humidity",
            "pressure",
            "wind_direction",
            "avg_wind_speed", 
            "max_wind_speed",
            "rainfall_1hr",
            "rainfall_24hr"
        )
        
        # Generate filename with current datetime for uniqueness
        current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"s3://{target_bucket}/dataset/{location}/all_data_{current_time}.csv"
        
        # Write as single CSV file containing ALL historical data for this location
        final_df.coalesce(1).write.mode("overwrite").option("header", "true").csv(output_path)
        
        # Get record count for logging
        record_count = final_df.count()
        print(f"Successfully wrote {record_count} records for {location} to {output_path}")
    
    print("Data transformation completed successfully")
    
except Exception as e:
    print(f"Error during data transformation: {str(e)}")
    raise e

job.commit()