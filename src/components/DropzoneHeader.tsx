import type { DragEventHandler } from "react";

export interface DropzoneHeaderProps {
  readonly onFiles: (files: readonly File[]) => void;
}

export const DropzoneHeader = ({ onFiles: _onFiles }: DropzoneHeaderProps) => {
  const onDrop: DragEventHandler<HTMLElement> = (event) => {
    event.preventDefault();
  };

  return (
    <section className="dropzone-header" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <h2>Import files</h2>
    </section>
  );
};
