"use client";

import { useEffect, useRef } from "react";

export default function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog className="sheet" ref={ref} onClose={onClose}>
      <div className="sheet-head">
        <h2>{title}</h2>
        <button className="btn btn-quiet" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="sheet-body">{open ? children : null}</div>
    </dialog>
  );
}
