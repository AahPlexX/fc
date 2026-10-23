export interface DropzoneHeaderProps {
  readonly onFiles: (files: readonly File[]) => void;
}

export const DropzoneHeader = ({ onFiles: _onFiles }: DropzoneHeaderProps) => (
  <section className="dropzone-header" aria-labelledby="import-heading">
    <h2 id="import-heading">Import files</h2>
  </section>
);
