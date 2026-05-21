const ACCOUNTS = [
  {
    name: "skibiditentalégumes",
    handle: "@gabzdigital_",
    following: "110",
    followers: "90,5K",
    likes: "277,1K",
  },
  {
    name: "fruitz.ia",
    handle: "@fruitz.ia",
    following: "21",
    followers: "48,2K",
    likes: "201,2K",
  },
];

export function SocialProofSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <h2 className="text-3xl font-extrabold">
          Des centaines de comptes utilisent{" "}
          <span className="text-accent">FruitDrama</span>
        </h2>
        <p className="mt-4 text-text-secondary">
          Rejoins la communauté des créateurs qui ont arrêté de jongler entre 5 logiciels.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
          {ACCOUNTS.map((acc) => (
            <div key={acc.handle} className="card-base w-full max-w-sm p-6 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-hover text-xl">
                  🍓
                </div>
                <div>
                  <p className="font-semibold text-white">{acc.name}</p>
                  <p className="text-sm text-text-secondary">{acc.handle}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <p className="font-bold text-white">{acc.following}</p>
                  <p className="text-text-muted">Suivis</p>
                </div>
                <div>
                  <p className="font-bold text-white">{acc.followers}</p>
                  <p className="text-text-muted">Followers</p>
                </div>
                <div>
                  <p className="font-bold text-white">{acc.likes}</p>
                  <p className="text-text-muted">J&apos;aime</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-bg-card px-5 py-2 text-sm text-white"
        >
          <span>♪</span> TikTok
        </button>
      </div>
    </section>
  );
}
