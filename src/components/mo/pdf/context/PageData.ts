import type { BodyBlock } from "../utils/BodyContentLayout";

export type PageData = {
  pageNumber: number;
  totalPages: number;
  blocks: BodyBlock[];
};

export type DocumentData = {
  title: string;
  sectorName: string;
  divisionName?: string;
  pages: PageData[];
};

export function buildDocumentData(
  title: string,
  sectorName: string,
  pages: PageData[],
  divisionName?: string,
): DocumentData {
  return {
    title,
    sectorName,
    divisionName,
    pages,
  };
}
