import { buildCityTaxonRoute } from "@/lib/routes/city-taxon";

export const dynamic = "force-dynamic";

const route = buildCityTaxonRoute("specialty");
export const generateMetadata = route.generateMetadata;
export default route.Page;
