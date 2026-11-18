import type { ReactElement } from 'react';
import { MAX_MEMBERS, MEMBER_GROUPS, type Member } from '../domain/schemas.js';
import { newMember } from './draft.js';
import { CheckField, SelectField } from './fields.js';
import { GROUP_LABELS } from './labels.js';
import { nextMemberId } from './options.js';
import styles from './setup.module.css';

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
    const id = nextMemberId(members.map((member) => member.id));
    onChange([...members, { ...newMember(members.length, 'child'), id }]);
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
              placeholder="Optional"
              onChange={(event) => {
                update(index, { name: event.target.value });
              }}
            />
          </label>
          <SelectField
            label="Age group"
            value={member.group}
            options={MEMBER_GROUPS}
            names={GROUP_LABELS}
            onChange={(group) => {
              update(index, { group });
            }}
          />
          <CheckField
            label="Asthma, lung or heart condition"
            value={member.respiratory}
            onChange={(respiratory) => {
              update(index, { respiratory });
            }}
          />
          <CheckField
            label="Works outdoors"
            value={member.outdoorWork}
            onChange={(outdoorWork) => {
              update(index, { outdoorWork });
            }}
          />
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
