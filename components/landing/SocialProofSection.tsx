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
    <section className="landing-social-section">
      <div className="landing-social-inner">
        <h2 className="landing-h2">
          Des centaines de comptes utilisent{" "}
          <span className="text-gradient">PubMoi</span>
        </h2>
        <p className="landing-sub">
          Rejoins la communauté des créateurs qui ont arrêté de jongler entre 5
          logiciels.
        </p>

        <div className="landing-social-cards">
          {ACCOUNTS.map((acc) => (
            <div key={acc.handle} className="card-base landing-social-card">
              <div className="landing-testimonial-handle">
                <span className="landing-testimonial-avatar">📢</span>
                <div>
                  <p style={{ fontWeight: 600 }}>{acc.name}</p>
                  <p style={{ fontSize: 13, color: "#7a6f64" }}>{acc.handle}</p>
                </div>
              </div>
              <div className="landing-social-stats">
                <div>
                  <strong>{acc.following}</strong>
                  <span>Suivis</span>
                </div>
                <div>
                  <strong>{acc.followers}</strong>
                  <span>Followers</span>
                </div>
                <div>
                  <strong>{acc.likes}</strong>
                  <span>J&apos;aime</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
