export const App = () => (
  <div className="app-shell">
    <a className="skip-link" href="#workspace">
      Skip to conversion workspace
    </a>
    <header className="workbench-header">
      <div className="brand-copy">
        <h1>OmniConvert</h1>
        <p>Private, domain-valid file conversion in your browser.</p>
      </div>
      <p className="privacy-badge" role="status">
        <span className="privacy-dot" aria-hidden="true" />
        Local processing only — zero file uploads
      </p>
    </header>
    <main className="workbench" id="workspace">
      <section className="workspace-intro" aria-labelledby="workspace-heading">
        <h2 id="workspace-heading">Conversion workspace</h2>
        <p>The verified client-side workbench is ready for domain-safe conversion tools.</p>
      </section>
    </main>
  </div>
);
