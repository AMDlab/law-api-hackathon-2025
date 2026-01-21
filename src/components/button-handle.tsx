import { Position, type HandleProps } from "@xyflow/react";
import { BaseHandle } from "@/components/base-handle";

const wrapperClassNames: Record<Position, string> = {
  [Position.Top]:
    "flex-col-reverse left-1/2 -translate-y-full -translate-x-1/2",
  [Position.Bottom]: "flex-col left-1/2 -translate-x-1/2 -translate-y-1/2",
  [Position.Left]:
    "flex-row-reverse top-1/2 -translate-x-full -translate-y-1/2",
  [Position.Right]: "top-1/2 -translate-y-1/2 -translate-x-1/2",
};

export function ButtonHandle({
  showButton = true,
  position = Position.Bottom,
  children,
  ...props
}: HandleProps & { showButton?: boolean }) {
  const wrapperClassName = wrapperClassNames[position || Position.Bottom];
  const vertical = position === Position.Top || position === Position.Bottom;
  const handleClassName = showButton ? undefined : "opacity-0 pointer-events-none";

  return (
    <BaseHandle position={position} id={props.id} className={handleClassName} {...props}>
      {showButton && (
        <div
          className={`absolute flex items-center ${wrapperClassName} pointer-events-none`}
        >
          <div className="nodrag nopan pointer-events-auto">{children}</div>
        </div>
      )}
    </BaseHandle>
  );
}
