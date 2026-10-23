import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import FeatureGate from "./components/FeatureGate";
import CustomerShell from "./layouts/CustomerShell";
import MerchantShell from "./layouts/MerchantShell";
import AdminShell from "./layouts/AdminShell";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PricingPage from "./pages/PricingPage";
import StoreLanding from "./pages/customer/StoreLanding";
import ShopsPage from "./pages/customer/ShopsPage";
import MenuPage from "./pages/customer/MenuPage";
import CartPage from "./pages/customer/CartPage";
import OrdersPage from "./pages/customer/OrdersPage";
import GiftCardsPage from "./pages/customer/GiftCardsPage";
import LoyaltyPage from "./pages/customer/LoyaltyPage";
import ScratchPage from "./pages/customer/ScratchPage";
import RewardsPage from "./pages/customer/RewardsPage";
import QueuePage from "./pages/customer/QueuePage";
import FeedbackPage from "./pages/customer/FeedbackPage";
import OnboardPage from "./pages/merchant/OnboardPage";
import DashboardPage from "./pages/merchant/DashboardPage";
import StoresPage from "./pages/merchant/StoresPage";
import MenuAdminPage from "./pages/merchant/MenuAdminPage";
import LoyaltyAdminPage from "./pages/merchant/LoyaltyAdminPage";
import QueueAdminPage from "./pages/merchant/QueueAdminPage";
import OrdersAdminPage from "./pages/merchant/OrdersAdminPage";
import SuppliesPage from "./pages/merchant/SuppliesPage";
import GiftCardsAdminPage from "./pages/merchant/GiftCardsAdminPage";
import RewardsAdminPage from "./pages/merchant/RewardsAdminPage";
import FeedbackAdminPage from "./pages/merchant/FeedbackAdminPage";
import CrmPage from "./pages/merchant/CrmPage";
import AnalyticsPage from "./pages/merchant/AnalyticsPage";
import BillingPage from "./pages/merchant/BillingPage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminMerchantsPage from "./pages/admin/AdminMerchantsPage";
import AdminMerchantDetailPage from "./pages/admin/AdminMerchantDetailPage";
import AdminStoresPage from "./pages/admin/AdminStoresPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAlertsPage from "./pages/admin/AdminAlertsPage";
import AdminAuditLogsPage from "./pages/admin/AdminAuditLogsPage";
import SessionBoot from "./components/SessionBoot";

export default function App() {
  return (
    <BrowserRouter>
      <SessionBoot />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<LoginPage admin />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/merchant/onboard" element={<OnboardPage />} />
        <Route path="/shops" element={<AuthGate><ShopsPage /></AuthGate>} />

        <Route path="/s/:code" element={<AuthGate><CustomerShell /></AuthGate>}>
          <Route index element={<StoreLanding />} />
          <Route path="t/:tableNumber" element={<StoreLanding />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="gift-cards" element={<AuthGate><GiftCardsPage /></AuthGate>} />
          <Route path="loyalty" element={<AuthGate><LoyaltyPage /></AuthGate>} />
          <Route path="scratch" element={<AuthGate><ScratchPage /></AuthGate>} />
          <Route path="rewards" element={<AuthGate><RewardsPage /></AuthGate>} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="feedback" element={<AuthGate><FeedbackPage /></AuthGate>} />
        </Route>

        <Route
          path="/merchant"
          element={
            <AuthGate roles={["MERCHANT", "STAFF", "SUPER_ADMIN"]}>
              <MerchantShell />
            </AuthGate>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="menu" element={<FeatureGate feature="AI_MENU" title="AI digital menu"><MenuAdminPage /></FeatureGate>} />
          <Route path="loyalty" element={<FeatureGate feature="DIGITAL_STAMPS" title="Digital stamp cards"><LoyaltyAdminPage /></FeatureGate>} />
          <Route path="queue" element={<FeatureGate feature="QR_QUEUE" title="Smart queue and tokens"><QueueAdminPage /></FeatureGate>} />
          <Route path="orders" element={<FeatureGate feature="ONLINE_ORDERING" title="Table ordering and gift cards"><OrdersAdminPage /></FeatureGate>} />
          <Route path="gift-cards" element={<FeatureGate feature="DIGITAL_STAMPS" title="Digital stamp cards"><GiftCardsAdminPage /></FeatureGate>} />
          <Route path="supplies" element={<SuppliesPage />} />
          <Route path="rewards" element={<FeatureGate feature="DIGITAL_STAMPS" title="Digital stamp cards"><RewardsAdminPage /></FeatureGate>} />
          <Route path="feedback" element={<FeatureGate feature="FEEDBACK_INBOX" title="Feedback and complaint inbox"><FeedbackAdminPage /></FeatureGate>} />
          <Route path="crm" element={<FeatureGate feature="CUSTOMER_CRM" title="Customer CRM"><CrmPage /></FeatureGate>} />
          <Route path="analytics" element={<FeatureGate feature="ANALYTICS" title="Analytics dashboard"><AnalyticsPage /></FeatureGate>} />
          <Route path="billing" element={<BillingPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AuthGate roles={["SUPER_ADMIN"]}>
              <AdminShell />
            </AuthGate>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="merchants" element={<AdminMerchantsPage />} />
          <Route path="merchants/:id" element={<AdminMerchantDetailPage />} />
          <Route path="stores" element={<AdminStoresPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="alerts" element={<AdminAlertsPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
