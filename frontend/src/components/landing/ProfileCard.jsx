function ProfileCard({ profile, index, isVisible }) {
  const Icon = profile.icon

  return (
    <article
      className={`audience-card audience-card-${profile.id} ${isVisible ? 'audience-card-visible' : ''}`}
      style={{ '--card-order': index }}
    >
      <div className="audience-card-topline">
        <span>{profile.discipline}</span>
        <span className="audience-card-index">0{index + 1}</span>
      </div>
      <div className="audience-icon-wrap">
        <Icon size={21} strokeWidth={1.55} aria-hidden="true" />
        <span className="audience-icon-accent" aria-hidden="true" />
      </div>
      <h3>{profile.title}</h3>
      <p className="audience-card-description">{profile.description}</p>
      <ul className="audience-capabilities">
        {profile.capabilities.map((capability) => (
          <li key={capability}>{capability}</li>
        ))}
      </ul>
      <div className="audience-card-footer">
        <span className="audience-footer-rule" />
        <span>{profile.footer}</span>
      </div>
    </article>
  )
}

export default ProfileCard