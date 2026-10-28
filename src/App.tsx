import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SettingsProvider } from './lib/settings';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { CataloguePage } from './pages/Catalogue';
import { ProductDetailPage } from './pages/ProductDetail';
import { WholesalePage } from './pages/Wholesale';
import { AboutPage } from './pages/About';
import { ContactPage } from './pages/Contact';
import { NotFoundPage } from './pages/NotFound';
import { AdminAuthProvider, RequireAuth } from './admin/AdminApp';
import { AdminLogin } from './admin/AdminLogin';
import { AdminLayout } from './admin/AdminLayout';
import { Dashboard } from './admin/Dashboard';
import { ProductsList } from './admin/Products';
import { ProductForm } from './admin/ProductForm';
import { CategoriesPage } from './admin/Categories';
import { EnquiriesPage } from './admin/Enquiries';
import { SettingsPage } from './admin/Settings';

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/produits" element={<CataloguePage />} />
            <Route path="/produits/:slug" element={<ProductDetailPage />} />
            <Route path="/gros" element={<WholesalePage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="/admin" element={<AdminAuthProvider />}>
            <Route path="login" element={<AdminLogin />} />
            <Route
              path=""
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="produits" element={<ProductsList />} />
              <Route path="produits/nouveau" element={<ProductForm />} />
              <Route path="produits/:id" element={<ProductForm />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="demandes" element={<EnquiriesPage />} />
              <Route path="parametres" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}
