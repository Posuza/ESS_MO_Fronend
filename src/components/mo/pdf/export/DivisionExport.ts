import { jsPDF } from "jspdf";
import { PDF_SUMMARY_EXPORT } from "../constant/Variable";
import {
  buildDetailContentSection,
  buildDivisionTableContentSection,
} from "../utils/ContentSections";
import { drawExportBodyContent } from "../utils/ExportBodyContentLayout";
import { registerExportFonts } from "../utils/ExportFont";
import {
  drawExportPageFooter,
  drawExportPageHeader,
} from "../utils/ExportPageLayout";
import { formatPdfRoundDateTitle } from "../utils/FormatDate";
import { buildSummaryExportPageLayoutPlans } from "../utils/PageLayout";

const TITLE = "รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)";

export async function buildDivisionExport(item: any, sectorName: string): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: PDF_SUMMARY_EXPORT.page.direction,
    unit: "mm",
    format: PDF_SUMMARY_EXPORT.page.size.toLowerCase(),
    compress: true,
  });
  await registerExportFonts(doc);

  const firstPageTitleSuffix = formatPdfRoundDateTitle(item);
  const sections = [
    buildDivisionTableContentSection("summaryExport", item),
    buildDetailContentSection("summaryExport", item),
  ];
  const totalPages = sections.reduce((sum, section) => sum + section.pages.length, 0);
  let pageNumber = 1;

  for (const section of sections) {
    const pages = buildSummaryExportPageLayoutPlans(section.pages);
    for (const page of pages) {
      if (pageNumber > 1) doc.addPage();
      const exportPage = { ...page, pageNumber, totalPages };
      await drawExportPageHeader(doc, {
        title: TITLE,
        sectorName,
        divisionName: section.divisionName,
        firstPageTitleSuffix,
        pageNumber,
      });
      drawExportBodyContent(doc, {
        ...section.layout,
        blocks: page.plan.blocks,
        columns: page.plan.columns,
      });
      drawExportPageFooter(doc, exportPage);
      pageNumber += 1;
    }
  }

  return doc;
}

export function exportDivisionPdf(
  item: any,
  sectorName: string,
  fileName = `division-${item?.id ?? "report"}.pdf`,
): Promise<void> {
  return buildDivisionExport(item, sectorName).then((doc) => {
    doc.save(fileName);
  });
}
