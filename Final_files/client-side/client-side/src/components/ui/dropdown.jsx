import * as React from "react";

export function DropdownMenu({ children, open, onOpenChange }) {
  return <div className="relative">{children}</div>;
}

export const DropdownMenuTrigger = React.forwardRef(
  ({ asChild, children, ...props }, ref) => {
    if (asChild) {
      return React.cloneElement(children, {
        ref,
        ...props,
        onClick: (e) => {
          if (children.props.onClick) children.props.onClick(e);
          if (props.onClick) props.onClick(e);
        },
      });
    }
    return (
      <button ref={ref} {...props}>
        {children}
      </button>
    );
  }
);

DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export function DropdownMenuContent({
  children,
  align = "end",
  className = "",
}) {
  return (
    <div
      className={`absolute ${
        align === "end" ? "right-0" : "left-0"
      } mt-2 w-40 bg-white rounded shadow-lg border z-50 ${className}`}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, className = "" }) {
  return (
    <div
      className={`px-4 py-2 hover:bg-gray-100 transition cursor-pointer ${className}`}
      onClick={onClick}
      role="menuitem"
      tabIndex={0}
    >
      {children}
    </div>
  );
}
