import { AI_ANALYSIS_TYPES, type AiAnalysisType } from '@garfit/domain';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AiAnalysisFiltersDto {
  @IsOptional()
  @IsIn(AI_ANALYSIS_TYPES)
  type?: AiAnalysisType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
