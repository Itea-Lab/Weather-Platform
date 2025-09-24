import { ButtonHTMLAttributes } from "react";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  icon?: React.ReactNode;
}

export default function ActionButton({
  title,
  icon = null,
  onClick,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      className="flex items-center px-4 py-2 bg-[#688055] text-white rounded-md hover:bg-[#4D5E3F] transition-colors"
      onClick={onClick}
      type={type}
      {...props}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <h3 className="text-md font-semibold ml-2">{title}</h3>
    </button>
  );
}
