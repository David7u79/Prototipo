import { describe, expect, it } from 'vitest';
import {
  EXPERIENCE_LEVELS,
  PRIMARY_GOALS,
  RECORD_SOURCES,
  RECORD_TYPES,
  RECORD_UNITS,
  UNIT_SYSTEMS,
} from '@garfit/domain';
import {
  EQUIPMENT,
  MOVEMENT_CATEGORIES,
  MOVEMENT_DIFFICULTIES,
  MUSCLE_GROUPS,
} from '@garfit/movements';
import {
  Equipment,
  ExperienceLevel,
  MovementCategory,
  MovementDifficulty,
  MuscleGroup,
  PrimaryGoal,
  RecordSource,
  RecordType,
  RecordUnit,
  UnitSystem,
} from '../src/generated/prisma/enums.js';

describe('enums compartidos', () => {
  it('coinciden con Prisma', () => {
    expect(Object.values(ExperienceLevel)).toEqual(EXPERIENCE_LEVELS);
    expect(Object.values(PrimaryGoal)).toEqual(PRIMARY_GOALS);
    expect(Object.values(UnitSystem)).toEqual(UNIT_SYSTEMS);
    expect(Object.values(RecordType)).toEqual(RECORD_TYPES);
    expect(Object.values(RecordUnit)).toEqual(RECORD_UNITS);
    expect(Object.values(RecordSource)).toEqual(RECORD_SOURCES);
    expect(Object.values(MovementCategory)).toEqual(MOVEMENT_CATEGORIES);
    expect(Object.values(Equipment)).toEqual(EQUIPMENT);
    expect(Object.values(MuscleGroup)).toEqual(MUSCLE_GROUPS);
    expect(Object.values(MovementDifficulty)).toEqual(MOVEMENT_DIFFICULTIES);
  });
});
