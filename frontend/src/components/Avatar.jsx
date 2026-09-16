import { initials, colorFor } from '../lib/format';
import { mediaUrl } from '../api';

export default function Avatar({ id, name, photoUrl, size = 36 }) {
  if (photoUrl) {
    return (
      <div
        className="avatar-circle avatar-photo"
        style={{ width: size, height: size }}
      >
        <img src={mediaUrl(photoUrl)} alt="" />
      </div>
    );
  }
  return (
    <div
      className="avatar-circle"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37), background: colorFor(id) }}
    >
      {initials(name)}
    </div>
  );
}
