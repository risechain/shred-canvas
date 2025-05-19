import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {};

interface InputFieldProps extends InputProps {
  label: string | React.ReactNode;
  legend?: string;
  fieldSet?: string;
  endAdornment?: React.ReactNode;
  startAdornment?: React.ReactNode;
}

export function InputField(props: Readonly<InputFieldProps>) {
  const {
    label,
    legend,
    fieldSet,
    className,
    endAdornment,
    startAdornment,
    ...inputProps
  } = props;

  return (
    <fieldset
      className={cn(
        "rounded-md border border-solid border-input-secondary",
        fieldSet
      )}
    >
      <legend className={cn("ml-2 px-2 text-sm text-muted-foreground", legend)}>
        {label}
      </legend>
      <div className="mt-[-0.5rem] flex items-center py-1">
        {startAdornment}
        <Input
          className={cn(
            "ring-offset-none border-none bg-transparent py-5 pl-4 pr-2 outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            className
          )}
          {...inputProps}
        />
        {endAdornment}
      </div>
    </fieldset>
  );
}
