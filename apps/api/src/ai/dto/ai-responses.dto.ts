import {
  AI_ANALYSIS_TYPES,
  AI_EVIDENCE_CATEGORIES,
  type AiAnalysisType,
  type AiEvidenceCategory,
} from '@garfit/domain';
import { ApiProperty } from '@nestjs/swagger';

export class AiStatusResponse {
  @ApiProperty() enabled!: boolean;
  @ApiProperty() configured!: boolean;
  @ApiProperty({ enum: ['GEMINI', 'FAKE'], enumName: 'AiProviderName' })
  provider!: 'GEMINI' | 'FAKE';
  @ApiProperty() model!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  consentGivenAt!: string | null;
}

export class AiConsentResponse {
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  consentGivenAt!: string | null;
}

export class AiEvidenceFactResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: AI_EVIDENCE_CATEGORIES, enumName: 'AiEvidenceCategory' })
  category!: AiEvidenceCategory;
  @ApiProperty() label!: string;
  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'number' }] }) value!: string | number;
  @ApiProperty({ required: false }) unit?: string;
  @ApiProperty({ required: false, format: 'date' }) occurredAt?: string;
}

export class AiDataUsedResponse {
  @ApiProperty() label!: string;
  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'number' }] }) value!: string | number;
}

export class AiAnalysisItemResponse {
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: [AiEvidenceFactResponse] }) evidence!: AiEvidenceFactResponse[];
}

export class AiAnalysisResponse {
  @ApiProperty({ type: String, nullable: true }) id!: string | null;
  @ApiProperty({ enum: AI_ANALYSIS_TYPES, enumName: 'AiAnalysisType' }) type!: AiAnalysisType;
  @ApiProperty({ enum: ['COMPLETED', 'INSUFFICIENT_DATA'], enumName: 'AiAnalysisStatus' })
  status!: 'COMPLETED' | 'INSUFFICIENT_DATA';
  @ApiProperty() cached!: boolean;
  @ApiProperty({ enum: ['GEMINI', 'FAKE'], enumName: 'AiProviderName', nullable: true })
  provider!: 'GEMINI' | 'FAKE' | null;
  @ApiProperty({ type: String, nullable: true }) model!: string | null;
  @ApiProperty({ type: String, nullable: true }) promptVersion!: string | null;
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
  @ApiProperty({ type: Number, nullable: true }) periodDays!: number | null;
  @ApiProperty() summary!: string;
  @ApiProperty({ type: [AiAnalysisItemResponse] }) observations!: AiAnalysisItemResponse[];
  @ApiProperty({ type: [AiAnalysisItemResponse] }) suggestions!: AiAnalysisItemResponse[];
  @ApiProperty({ type: [String] }) limitations!: string[];
  @ApiProperty({ type: [String] }) missingData!: string[];
  @ApiProperty({ type: [AiDataUsedResponse] }) dataUsed!: AiDataUsedResponse[];
}
