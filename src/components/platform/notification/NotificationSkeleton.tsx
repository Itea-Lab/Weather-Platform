interface NotificationSkeletonProps {
  count?: number;
}

export function NotificationSkeleton({ count = 3 }: NotificationSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow border p-4 animate-pulse"
        >
          <div className="flex items-start gap-3">
            {/* Icon skeleton */}
            <div className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0 mt-1"></div>

            <div className="flex-1 space-y-2">
              {/* Title skeleton */}
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>

              {/* Message skeleton */}
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>

              {/* Metadata skeleton */}
              <div className="flex items-center gap-4 mt-3">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>

            {/* Action button skeleton */}
            <div className="w-16 h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConnectionSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}
