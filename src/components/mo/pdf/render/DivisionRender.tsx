import {
  buildDetailContentSection,
  buildDivisionTableContentSection,
} from "../utils/ContentSections";
import { buildRenderPageLayoutPlans } from "../utils/PageLayout";
import { RenderBodyContentLayout } from "../utils/RenderBodyContentLayout";
import { RenderPageLayout } from "../utils/RenderPageLayout";
import { formatPdfRoundDateTitle } from "../utils/FormatDate";

type DivisionRenderProps = {
  item: any;
  sectorName: string;
};

const TITLE = "รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)";

export function DivisionRender({ item, sectorName }: DivisionRenderProps) {
  const firstPageTitleSuffix = formatPdfRoundDateTitle(item);
  const sections = [
    buildDivisionTableContentSection("render", item),
    buildDetailContentSection("render", item),
  ];
  const pagePlans = sections.flatMap((section) => section.pages);
  const pages = buildRenderPageLayoutPlans(pagePlans);
  let pageOffset = 0;

  return (
    <>
      {sections.flatMap((section) => {
        const sectionPages = buildRenderPageLayoutPlans(section.pages).map((page) => ({
          ...page,
          pageNumber: page.pageNumber + pageOffset,
          totalPages: pages.length,
        }));
        pageOffset += section.pages.length;
        return sectionPages.map((page) => (
          <RenderPageLayout
            key={`${section.key}-${page.pageNumber}`}
            page={page}
            title={TITLE}
            sectorName={sectorName}
            divisionName={section.divisionName}
            firstPageTitleSuffix={firstPageTitleSuffix}
          >
            <RenderBodyContentLayout
              layout={{
                ...section.layout,
                blocks: page.plan.blocks,
                columns: page.plan.columns,
              }}
            />
          </RenderPageLayout>
        ));
      })}
    </>
  );
}
