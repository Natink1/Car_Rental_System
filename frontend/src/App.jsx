import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CarList } from "./pages/CarList";
import { CarDetail } from "./pages/CarDetail";
import { BookingList } from "./pages/BookingList";
import { Chat } from "./pages/Chat";
import { AddCar } from "./pages/AddCar";
import { EditCar } from "./pages/EditCar";
import { CustomerDashboard } from "./pages/dashboards/CustomerDashboard";
import { OwnerDashboard } from "./pages/dashboards/OwnerDashboard";
import { AdminDashboard } from "./pages/dashboards/AdminDashboard";
import { AdminCarDetail } from "./pages/AdminCarDetail";
import { AdminUsers } from "./pages/dashboards/AdminUsers";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="light"
        />
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <HomePage />
              </Layout>
            }
          />
          <Route
            path="/login"
            element={
              <Layout>
                <Login />
              </Layout>
            }
          />
          <Route
            path="/register"
            element={
              <Layout>
                <Register />
              </Layout>
            }
          />
          <Route
            path="/cars"
            element={
              <Layout>
                <CarList />
              </Layout>
            }
          />
          <Route
            path="/cars/:id"
            element={
              <Layout>
                <CarDetail />
              </Layout>
            }
          />
          <Route
            path="/chat"
            element={
              <Layout>
                <Chat />
              </Layout>
            }
          />
          <Route
            path="/bookings"
            element={
              <Layout>
                <ProtectedRoute allowedRoles={["customer", "owner"]}>
                  <BookingList />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/owner/cars/new"
            element={
              <Layout>
                <ProtectedRoute allowedRoles={["owner"]}>
                  <AddCar />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/owner/cars/:id/edit"
            element={
              <Layout>
                <ProtectedRoute allowedRoles={["owner"]}>
                  <EditCar />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/customer/dashboard"
            element={
              <Layout>
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CustomerDashboard />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/owner/dashboard"
            element={
              <Layout>
                <ProtectedRoute allowedRoles={["owner"]}>
                  <OwnerDashboard />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <Layout>
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/admin/cars/:id"
            element={
              <Layout>
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminCarDetail />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/admin/users"
            element={
              <Layout>
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminUsers />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
