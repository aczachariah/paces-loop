import React from 'react';
import { AssessmentCriterion } from '@paces/shared';

interface ConfigEditorProps {
  editTitle: string;
  setEditTitle: (val: string) => void;
  editDescription: string;
  setEditDescription: (val: string) => void;
  editCandidateInstructions: string;
  setEditCandidateInstructions: (val: string) => void;
  editPatientBrief: string;
  setEditPatientBrief: (val: string) => void;
  editExaminerBrief: string;
  setEditExaminerBrief: (val: string) => void;
  editCriteria: AssessmentCriterion[];
  handleUpdateCriterionText: (index: number, description: string) => void;
  handleSaveConfig: () => void;
  setIsEditing: (val: boolean) => void;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editCandidateInstructions,
  setEditCandidateInstructions,
  editPatientBrief,
  setEditPatientBrief,
  editExaminerBrief,
  setEditExaminerBrief,
  editCriteria,
  handleUpdateCriterionText,
  handleSaveConfig,
  setIsEditing,
}) => {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '2rem', marginBottom: '2rem', border: '2px solid #3b82f6' }}>
      <h3 style={{ marginTop: 0, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
        Station Configuration Editor
      </h3>
      
      <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Station Title</label>
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Station Description</label>
          <textarea
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Candidate Instructions</label>
            <textarea
              value={editCandidateInstructions}
              onChange={e => setEditCandidateInstructions(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Patient Brief</label>
            <textarea
              value={editPatientBrief}
              onChange={e => setEditPatientBrief(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Examiner Brief</label>
            <textarea
              value={editExaminerBrief}
              onChange={e => setEditExaminerBrief(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
            Assessment Criteria / Expected Steps
          </label>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {editCriteria.map((criterion, idx) => (
              <div key={criterion.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#4b5563', minWidth: '80px', textAlign: 'center' }}>
                  {criterion.category}
                </span>
                <input
                  type="text"
                  value={criterion.description}
                  onChange={e => handleUpdateCriterionText(idx, e.target.value)}
                  style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <span style={{ fontSize: '0.875rem', color: '#6b7280', minWidth: '50px' }}>
                  {criterion.points} pt{criterion.points > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button
            onClick={() => setIsEditing(false)}
            style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveConfig}
            style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            Save Config Changes
          </button>
        </div>
      </div>
    </div>
  );
};