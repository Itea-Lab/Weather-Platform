import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import * as stepfunctionsTasks from "aws-cdk-lib/aws-stepfunctions-tasks";

import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface CustomEventBridgeProps {
  accountId: string;
  region: string;
  crawlerName: string;
  jobName: string;
}

export class CustomEventBridge extends Construct {
  public readonly rule: events.Rule;
  public readonly stateMachine: stepfunctions.StateMachine;

  constructor(scope: Construct, id: string, props: CustomEventBridgeProps) {
    super(scope, id);

    const { accountId, region, crawlerName, jobName } = props;

    // Generate unique suffix for resources based on crawler name
    const uniqueSuffix = crawlerName.split("-").pop() || "default";
    const ruleName = `WeatherDataProcessingRule-${uniqueSuffix}`;

    // Create EventBridge rule for midnight UTC+7 (17:00 UTC) every Sunday
    this.rule = new events.Rule(this, "WeatherDataProcessingRule", {
      ruleName: ruleName,
      description:
        "Triggers weather data processing pipeline at midnight UTC+7 every Sunday",
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "17", // 17:00 UTC = 00:00 UTC+7
        month: "*",
        year: "*",
        weekDay: "SUN", // Sunday
      }),
    });

    // Create Step Function role with proper permissions
    const stepFunctionRole = new iam.Role(this, "StepFunctionRole", {
      assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
      description: "Role for Step Function to orchestrate Glue workflow",
    });

    stepFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowGlueOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "glue:StartCrawler",
          "glue:GetCrawler",
          "glue:StartJobRun",
          "glue:GetJobRun",
          "glue:BatchStopJobRun",
        ],
        resources: [
          `arn:aws:glue:${region}:${accountId}:crawler/${crawlerName}`,
          `arn:aws:glue:${region}:${accountId}:job/WeatherDataTransformJob`,
        ],
      })
    );

    // Define Step Function tasks
    const startCrawler = new stepfunctionsTasks.GlueStartCrawlerRun(
      this,
      "StartCrawler",
      {
        crawlerName: crawlerName,
      }
    );

    const waitForCrawler = new stepfunctions.Wait(this, "WaitForCrawler", {
      time: stepfunctions.WaitTime.duration(Duration.minutes(2)),
    });

    const checkCrawlerStatus = new stepfunctionsTasks.CallAwsService(
      this,
      "CheckCrawlerStatus",
      {
        service: "glue",
        action: "getCrawler",
        parameters: {
          Name: crawlerName,
        },
        iamResources: [
          `arn:aws:glue:${region}:${accountId}:crawler/${crawlerName}`,
        ],
      }
    );

    const startGlueJob = new stepfunctionsTasks.GlueStartJobRun(
      this,
      "StartGlueJob",
      {
        glueJobName: jobName,
        integrationPattern: stepfunctions.IntegrationPattern.RUN_JOB,
      }
    );

    // Define the workflow conditions
    const crawlerComplete = stepfunctions.Condition.or(
      stepfunctions.Condition.stringEquals("$.Crawler.State", "READY"),
      stepfunctions.Condition.stringEquals("$.Crawler.State", "STOPPING")
    );
    const crawlerRunning = stepfunctions.Condition.stringEquals(
      "$.Crawler.State",
      "RUNNING"
    );

    // Create the workflow definition with proper state connections
    const definition = startCrawler
      .next(waitForCrawler)
      .next(checkCrawlerStatus)
      .next(
        new stepfunctions.Choice(this, "IsCrawlerComplete")
          .when(crawlerComplete, startGlueJob)
          .when(crawlerRunning, waitForCrawler)
          .otherwise(
            new stepfunctions.Fail(this, "CrawlerFailed", {
              cause: "Crawler failed or in unexpected state",
            })
          )
      );

    // Create the state machine
    this.stateMachine = new stepfunctions.StateMachine(
      this,
      "WeatherDataProcessingStateMachine",
      {
        definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
        role: stepFunctionRole,
        timeout: Duration.hours(2),
      }
    );

    // Add Step Function as target to EventBridge rule
    this.rule.addTarget(new targets.SfnStateMachine(this.stateMachine));
  }
}
