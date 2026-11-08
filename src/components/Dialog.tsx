"use client";

import { useEffect, useRef } from "react";

export default function Dialog({
  open,
  title,
  onClose,
  size = "md",
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A click that lands on the <dialog> itself (not its contents) is the backdrop.
  // Only when the press also started there, so a drag out of a text field doesn't close it.
  const pressedBackdrop = useRef(false);
  const onPress = (event: React.PointerEvent<HTMLDialogElement>) => {
    pressedBackdrop.current = event.target === event.currentTarget;
  };
  const onBackdrop = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget && pressedBackdrop.current) onClose();
    pressedBackdrop.current = false;
  };

  return (
    <dialog
      className="sheet"
      data-size={size}
      ref={ref}
      onClose={(event) => {
        // Ignore a nested dialog closing inside this one.
        if (event.target === event.currentTarget) onClose();
      }}
      onPointerDown={onPress}
      onClick={onBackdrop}
      aria-label={title}
    >
      <div className="sheet-inner">
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sheet-body">{open ? children : null}</div>
      </div>
    </dialog>
  );
}
