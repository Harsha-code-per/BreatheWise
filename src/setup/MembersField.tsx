import { type ReactElement, type Ref, useEffect, useRef } from 'react';
import { MAX_MEMBERS, MEMBER_GROUPS, type Member } from '../domain/schemas.js';
import { newMember } from './draft.js';
import { CheckField, SelectField } from './fields.js';
import { GROUP_LABELS } from './labels.js';
import { nextMemberId } from './options.js';
import styles from './setup.module.css';

/**
 * Edits the member list. Adding or removing a person re-renders the list, so focus is placed
 * once it has: on the new person's name, or on the add button when the pressed Remove has gone.
 */
function useMemberList(members: Member[], onChange: (members: Member[]) => void) {
  const focusNext = useRef<'new' | 'add' | null>(null);
  const lastName = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusNext.current === 'new') lastName.current?.focus();
    if (focusNext.current === 'add') addButton.current?.focus();
    focusNext.current = null;
  }, [members.length]);

  return {
    lastName,
    addButton,
    update: (index: number, patch: Partial<Member>) => {
      onChange(members.map((member, i) => (i === index ? { ...member, ...patch } : member)));
    },
    add: () => {
      const id = nextMemberId(members.map((member) => member.id));
      focusNext.current = 'new';
      onChange([...members, { ...newMember(members.length, 'child'), id }]);
    },
    remove: (index: number) => {
      focusNext.current = 'add';
      onChange(members.filter((_, i) => i !== index));
    },
  };
}

interface RowProps {
  member: Member;
  nameRef: Ref<HTMLInputElement> | undefined;
  onUpdate: (patch: Partial<Member>) => void;
  onRemove: (() => void) | undefined;
}

/** One person: name, age group, health and work flags, and Remove when others remain. */
function MemberRow({ member, nameRef, onUpdate, onRemove }: RowProps): ReactElement {
  return (
    <div className={styles['member']}>
      <label className="field">
        Name
        <input
          ref={nameRef}
          value={member.name}
          maxLength={40}
          placeholder="Optional"
          onChange={(event) => {
            onUpdate({ name: event.target.value });
          }}
        />
      </label>
      <SelectField
        label="Age group"
        value={member.group}
        options={MEMBER_GROUPS}
        names={GROUP_LABELS}
        onChange={(group) => {
          onUpdate({ group });
        }}
      />
      <CheckField
        label="Asthma, lung or heart condition"
        value={member.respiratory}
        onChange={(respiratory) => {
          onUpdate({ respiratory });
        }}
      />
      <CheckField
        label="Works outdoors"
        value={member.outdoorWork}
        onChange={(outdoorWork) => {
          onUpdate({ outdoorWork });
        }}
      />
      {onRemove ? (
        <button type="button" className="button button-quiet" onClick={onRemove}>
          Remove {member.name || 'this person'}
        </button>
      ) : null}
    </div>
  );
}

/** Who lives at home, and who needs extra care on smoggy days. */
export function MembersField({
  members,
  onChange,
}: {
  members: Member[];
  onChange: (members: Member[]) => void;
}): ReactElement {
  const { lastName, addButton, update, add, remove } = useMemberList(members, onChange);
  const last = members.length - 1;
  return (
    <fieldset className={styles['group']}>
      <legend>Who is in your family?</legend>
      {members.map((member, index) => (
        <MemberRow
          key={member.id}
          member={member}
          nameRef={index === last ? lastName : undefined}
          onUpdate={(patch) => {
            update(index, patch);
          }}
          onRemove={
            members.length > 1
              ? () => {
                  remove(index);
                }
              : undefined
          }
        />
      ))}
      {members.length < MAX_MEMBERS ? (
        <button ref={addButton} type="button" className="button button-quiet" onClick={add}>
          Add a family member
        </button>
      ) : null}
    </fieldset>
  );
}
