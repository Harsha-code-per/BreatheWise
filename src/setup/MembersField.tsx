import type { ReactElement } from 'react';
import { MEMBER_GROUPS, type Member } from '../domain/schemas.js';
import { newMember } from './draft.js';
import { GROUP_LABELS } from './labels.js';
import styles from './setup.module.css';

/** Most families this size or larger share a home; the schema allows up to 12. */
const MAX_MEMBERS = 12;

/** Who lives at home, and who needs extra care on smoggy days. */
export function MembersField({
  members,
  onChange,
}: {
  members: Member[];
  onChange: (members: Member[]) => void;
}): ReactElement {
  const update = (index: number, patch: Partial<Member>) => {
    onChange(members.map((member, i) => (i === index ? { ...member, ...patch } : member)));
  };
  const add = () => {
    const next = Math.max(...members.map((member) => Number(member.id.split('-')[1]))) + 1;
    onChange([...members, newMember(next, 'child')]);
  };

  return (
    <fieldset className={styles['group']}>
      <legend>Who is in your family?</legend>
      {members.map((member, index) => (
        <div key={member.id} className={styles['member']}>
          <label className="field">
            Name
            <input
              value={member.name}
              maxLength={40}
              onChange={(event) => {
                update(index, { name: event.target.value });
              }}
            />
          </label>
          <label className="field">
            Age group
            <select
              value={member.group}
              onChange={(event) => {
                update(index, { group: event.target.value as Member['group'] });
              }}
            >
              {MEMBER_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {GROUP_LABELS[group]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles['check']}>
            <input
              type="checkbox"
              checked={member.respiratory}
              onChange={(event) => {
                update(index, { respiratory: event.target.checked });
              }}
            />
            Asthma, lung or heart condition
          </label>
          <label className={styles['check']}>
            <input
              type="checkbox"
              checked={member.outdoorWork}
              onChange={(event) => {
                update(index, { outdoorWork: event.target.checked });
              }}
            />
            Works outdoors
          </label>
          {members.length > 1 ? (
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                onChange(members.filter((_, i) => i !== index));
              }}
            >
              Remove {member.name || 'this person'}
            </button>
          ) : null}
        </div>
      ))}
      {members.length < MAX_MEMBERS ? (
        <button type="button" className="button button-quiet" onClick={add}>
          Add a family member
        </button>
      ) : null}
    </fieldset>
  );
}
