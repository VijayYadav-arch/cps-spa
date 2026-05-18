import { useState } from 'react';
import {
  createBereavementContact,
  type BereavementContact,
  type BereavementContactPreference,
  type BereavementContactRelationship,
} from '@/api/hospice';

interface Props {
  programId: number;
  onCreated: (contact: BereavementContact) => void;
}

const RELATIONSHIPS: BereavementContactRelationship[] = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Friend',
  'Other',
];
const PREFERENCES: BereavementContactPreference[] = [
  'Phone',
  'Email',
  'Mail',
  'InPerson',
];

export function BereavementContactForm({ programId, onCreated }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationship, setRelationship] =
    useState<BereavementContactRelationship>('Spouse');
  const [contactPreference, setContactPreference] =
    useState<BereavementContactPreference>('Phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    setBusy(true);
    try {
      const contact = await createBereavementContact(programId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        relationship,
        contactPreference,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        isPrimaryContact,
        notes: notes.trim() || null,
      });
      onCreated(contact);
      setFirstName('');
      setLastName('');
      setRelationship('Spouse');
      setContactPreference('Phone');
      setPhone('');
      setEmail('');
      setAddress('');
      setIsPrimaryContact(false);
      setNotes('');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to add contact.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600 }}>Add Contact</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>First Name</span>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Last Name</span>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Relationship</span>
          <select
            value={relationship}
            onChange={(e) =>
              setRelationship(e.target.value as BereavementContactRelationship)
            }
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Contact Preference</span>
          <select
            value={contactPreference}
            onChange={(e) =>
              setContactPreference(e.target.value as BereavementContactPreference)
            }
          >
            {PREFERENCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Phone</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Address</span>
        <input value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={isPrimaryContact}
          onChange={(e) => setIsPrimaryContact(e.target.checked)}
        />
        <span>Primary contact</span>
      </label>
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </label>
      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Add Contact'}
      </button>
    </form>
  );
}
