export default function SettingsPage() {
  return (
    <div className="app-page">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>
          Paramètres
        </h1>
        <p style={{ color: "#555", fontSize: 14 }}>Gère ton compte et tes préférences</p>
      </div>

      <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
        <section className="card">
          <h2 className="font-semibold text-white">Compte</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs text-text-secondary">Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                className="mt-1 w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-white focus:border-accent focus:outline-none"
              />
            </div>
            <button type="button" className="btn-sec" style={{ width: "100%", justifyContent: "center" }}>
              Sauvegarder
            </button>
          </div>
        </section>

        <section className="card">
          <h2 style={{ fontWeight: 600, color: "#fff" }}>Langue</h2>
          <select className="mt-4 w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-white">
            <option>Français</option>
            <option>English</option>
          </select>
        </section>

        <section className="card" style={{ borderColor: "rgba(255,68,68,0.2)" }}>
          <h2 style={{ fontWeight: 600, color: "#ff6666" }}>Zone danger</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Supprimer définitivement ton compte et toutes tes vidéos.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            Supprimer mon compte
          </button>
        </section>
      </div>
    </div>
  );
}
