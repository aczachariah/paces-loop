import { cardiovascularStation } from './cardiovascular';
import type { StationConfig } from './cardiovascular';

function runTests() {
  console.log('Running Cardiovascular Station Config Tests...');

  // Test 1: Verify initial config structure
  console.log('Test 1: Verifying initial config structure...');
  if (!cardiovascularStation) {
    throw new Error('cardiovascularStation is not defined');
  }
  if (cardiovascularStation.station.id !== 'cardiovascular-examination') {
    throw new Error(`Expected station ID to be 'cardiovascular-examination', got '${cardiovascularStation.station.id}'`);
  }
  if (cardiovascularStation.station.title !== 'Cardiovascular Examination') {
    throw new Error(`Expected station title to be 'Cardiovascular Examination', got '${cardiovascularStation.station.title}'`);
  }
  if (cardiovascularStation.station.type !== 'examination') {
    throw new Error(`Expected station type to be 'examination', got '${cardiovascularStation.station.type}'`);
  }
  console.log('✓ Test 1 passed!');

  // Test 2: Verify scenario briefs
  console.log('Test 2: Verifying scenario briefs...');
  const { scenario } = cardiovascularStation;
  if (!scenario.candidateInstructions || !scenario.patientBrief || !scenario.examinerBrief) {
    throw new Error('Scenario briefs are missing required fields');
  }
  console.log('✓ Test 2 passed!');

  // Test 3: Verify assessment criteria
  console.log('Test 3: Verifying assessment criteria...');
  const { assessmentCriteria } = cardiovascularStation;
  if (!Array.isArray(assessmentCriteria) || assessmentCriteria.length === 0) {
    throw new Error('Assessment criteria should be a non-empty array');
  }
  assessmentCriteria.forEach(criterion => {
    if (!criterion.id || !criterion.category || !criterion.description || typeof criterion.points !== 'number') {
      throw new Error(`Invalid criterion: ${JSON.stringify(criterion)}`);
    }
  });
  console.log('✓ Test 3 passed!');

  // Test 4: Verify config editability
  console.log('Test 4: Verifying config editability...');
  const editedConfig: StationConfig = {
    ...cardiovascularStation,
    station: {
      ...cardiovascularStation.station,
      title: 'Custom Cardiovascular Exam',
    },
    scenario: {
      ...cardiovascularStation.scenario,
      candidateInstructions: 'Custom instructions',
    }
  };

  if (editedConfig.station.title !== 'Custom Cardiovascular Exam') {
    throw new Error('Failed to edit station title');
  }
  if (editedConfig.scenario.candidateInstructions !== 'Custom instructions') {
    throw new Error('Failed to edit candidate instructions');
  }
  console.log('✓ Test 4 passed!');

  // Test 5: Verify mock feedback structure
  console.log('Test 5: Verifying mock feedback structure...');
  const { mockFeedback } = cardiovascularStation;
  if (!Array.isArray(mockFeedback) || mockFeedback.length !== 3) {
    throw new Error('Expected mockFeedback to be an array of 3 items');
  }
  const performances = mockFeedback.map(f => f.performance);
  if (!performances.includes('excellent') || !performances.includes('satisfactory') || !performances.includes('needs-improvement')) {
    throw new Error('mockFeedback is missing one or more performance levels');
  }
  mockFeedback.forEach(f => {
    if (typeof f.score !== 'number' || !f.feedback) {
      throw new Error(`Invalid mock feedback item: ${JSON.stringify(f)}`);
    }
  });
  console.log('✓ Test 5 passed!');

  console.log('\nAll Cardiovascular Station Config Tests Passed Successfully!');
}

runTests();