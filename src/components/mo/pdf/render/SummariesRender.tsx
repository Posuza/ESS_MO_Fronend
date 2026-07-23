import {
  buildSummaryDivisionContentSections,
  buildSummaryTableContentSection,
} from "../utils/ContentSections";
import { buildRenderPageLayoutPlans } from "../utils/PageLayout";
import { RenderBodyContentLayout } from "../utils/RenderBodyContentLayout";
import { RenderPageLayout } from "../utils/RenderPageLayout";

type SummariesRenderProps = {
  item: any;
  sectorName: string;
  reports?: any[];
};

const TITLE = "รายงานประจำวันฝ่ายปฏิบัติการ";

export function SummariesRender({
  item,
  sectorName,
  reports = [],
}: SummariesRenderProps) {
  const sections = [
    buildSummaryTableContentSection("render", item, reports),
    ...buildSummaryDivisionContentSections("render", item, reports),
  ];
  const totalPages = sections.reduce((sum, section) => sum + section.pages.length, 0);
  let pageOffset = 0;

  return (
    <>
      {sections.flatMap((section) => {
        const sectionPages = buildRenderPageLayoutPlans(section.pages).map((page) => ({
          ...page,
          pageNumber: page.pageNumber + pageOffset,
          totalPages,
        }));
        pageOffset += section.pages.length;
        return sectionPages.map((page) => (
          <RenderPageLayout
            key={`${section.key}-${page.pageNumber}`}
            page={page}
            title={TITLE}
            sectorName={sectorName}
            divisionName={section.divisionName}
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
