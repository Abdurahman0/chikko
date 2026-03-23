import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';

function ProductsPage() {
  return (
    <PagePlaceholder
      route={getRouteById('products')}
      summary="Catalog scaffold for future product lists, category views, pricing details, and stock visibility."
      sectionTitle="Product Catalog Scaffold"
      sectionDescription="This route is intended for a product administration surface with catalog browsing, pricing context, and inventory-ready views."
      emptyStateTitle="Product catalog UI is not implemented yet"
      emptyStateDescription="Future tasks can add product tables, pricing cards, and catalog management controls here while keeping the shared page composition."
    />
  );
}

export default ProductsPage;

