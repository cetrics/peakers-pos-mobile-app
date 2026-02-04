import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

const API = "http://192.168.1.66:5000";

type ProductsResponse = {
  products: Product[];
};

type CustomersResponse = {
  customers: Customer[];
};

type AddCustomerResponse = {
  customer: {
    customer_id: number;
    customer_name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
};

type CompanyDetailsResponse = {
  company: string;
  company_phone: string;
};

type CheckoutResponse = {
  order_number: string;
};

type Product = {
  product_id: number;
  product_name: string;
  product_price: string;
  product_stock: number;
  is_bundle?: boolean;
};

type Customer = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
};

type CompanyDetails = {
  company: string;
  company_phone: string;
};

const SalesMobile = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [customerModal, setCustomerModal] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [paymentType, setPaymentType] = useState("Mpesa");
  const [vatRate, setVatRate] = useState(0.16);
  const [discount, setDiscount] = useState(0);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    company: "",
    company_phone: "",
  });
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  /* ---------------- Fetch Data ---------------- */
  useEffect(() => {
    fetchProducts();
    fetchCompanyDetails();
  }, []);

  const fetchProducts = () => {
    axios
      .get<ProductsResponse>(`${API}/get-sales-products`)
      .then((res) => {
        setProducts(res.data.products);
        setFilteredProducts(res.data.products);
      })
      .catch(() => Alert.alert("Error", "Failed to load products"));
  };

  const fetchCustomers = () => {
    axios
      .get<CustomersResponse>(`${API}/get-sales-customers`)
      .then((res) => {
        setCustomers(res.data.customers);
      })
      .catch(() => Alert.alert("Error", "Failed to load customers"));
  };

  const fetchCompanyDetails = () => {
    axios
      .get<CompanyDetailsResponse>(`${API}/get-company-details`)
      .then((res) => setCompanyDetails(res.data))
      .catch(() => Alert.alert("Error", "Failed to load company details"));
  };

  /* ---------------- Search ---------------- */
  useEffect(() => {
    if (!search) return setFilteredProducts(products);
    setFilteredProducts(
      products.filter(
        (p) =>
          p.product_name.toLowerCase().includes(search.toLowerCase()) ||
          String(p.product_price).includes(search) ||
          String(p.product_id).includes(search),
      ),
    );
  }, [search, products]);

  /* ---------------- Cart Logic ---------------- */
  const addToCart = (product: Product) => {
    if (product.product_stock < 1) {
      Alert.alert("Out of Stock", "This product is out of stock.");
      return;
    }

    const existing = cart.find((i) => i.product_id === product.product_id);

    if (existing) {
      setCart(
        cart.map((i) =>
          i.product_id === product.product_id
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: (i.quantity + 1) * parseFloat(product.product_price),
              }
            : i,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
          subtotal: parseFloat(product.product_price),
        },
      ]);
    }
  };

  const updateCartQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = cart.find((i) => i.product_id === productId);
    if (!item) return;

    if (newQuantity > item.product_stock) {
      Alert.alert(
        "Stock Limit",
        `Only ${item.product_stock} items available in stock`,
      );
      return;
    }

    setCart(
      cart.map((i) =>
        i.product_id === productId
          ? {
              ...i,
              quantity: newQuantity,
              subtotal: newQuantity * parseFloat(i.product_price),
            }
          : i,
      ),
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  /* ---------------- Customer Management ---------------- */
  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      Alert.alert("Error", "Customer name is required.");
      return;
    }

    try {
      const payload = {
        customer_name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address,
      };

      const response = await axios.post<AddCustomerResponse>(
        `${API}/add-sales-customer`,
        payload,
      );

      const addedCustomer = response.data.customer;

      const mappedCustomer: Customer = {
        id: addedCustomer.customer_id,
        name: addedCustomer.customer_name,
        phone: addedCustomer.phone || "",
        email: addedCustomer.email || "",
        address: addedCustomer.address || "",
      };

      setSelectedCustomer(mappedCustomer);
      setCustomers([mappedCustomer, ...customers]);
      setCustomerModal(false);
      setAddingCustomer(false);
      setNewCustomer({ name: "", phone: "", email: "", address: "" });
      Alert.alert("Success", "Customer added successfully!");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to add customer",
      );
    }
  };

  /* ---------------- Checkout ---------------- */
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert("Error", "Cart is empty.");
      return;
    }

    if (!selectedCustomer) {
      Alert.alert("Error", "Please select a customer.");
      return;
    }

    try {
      const totalAmount = cart.reduce(
        (sum, item) => sum + parseFloat(item.subtotal),
        0,
      );
      const vat = totalAmount * vatRate;
      const finalTotal = totalAmount + vat - discount;

      const payload = {
        customer_id: selectedCustomer.id,
        payment_type: paymentType,
        cart_items: cart.map(
          ({ product_id, quantity, subtotal, is_bundle }) => ({
            product_id,
            quantity,
            subtotal,
            is_bundle,
          }),
        ),
        vat: vat,
        discount: discount,
      };

      const response = await axios.post<CheckoutResponse>(
        `${API}/process-sale`,
        payload,
      );

      const orderNumber = response.data.order_number;

      Alert.alert("Success", "Sale processed successfully!");
      setCart([]);
      setSelectedCustomer(null);
      setVatRate(0.16);
      setDiscount(0);
      printReceipt(payload, totalAmount, vat, discount, orderNumber);
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.error === "INSUFFICIENT_STOCK") {
        Alert.alert("Stock Error", errorData.message);
      } else {
        Alert.alert("Error", errorData?.error || "Error processing sale.");
      }
    }
  };

  const printReceipt = (
    saleData: any,
    totalAmount: number,
    vat: number,
    discount: number,
    orderNumber: string,
  ) => {
    const receipt = `
      ${companyDetails.company}
      ${companyDetails.company_phone}
      -------------------------------
      RECEIPT
      Order No: ${orderNumber}
      Date: ${new Date().toLocaleString()}
      Customer: ${selectedCustomer?.name || "Guest"}
      -------------------------------
      ITEMS:
      ${saleData.cart_items
        .map(
          (item: any) => `
        ${item.quantity} x ${products.find((p) => p.product_id === item.product_id)?.product_name || "Unknown"}
        ${item.is_bundle ? "(Bundle)" : ""} - Ksh ${item.subtotal.toFixed(2)}
      `,
        )
        .join("")}
      -------------------------------
      Subtotal: Ksh ${totalAmount.toFixed(2)}
      VAT (${(vatRate * 100).toFixed(0)}%): Ksh ${vat.toFixed(2)}
      Discount: Ksh ${discount.toFixed(2)}
      Total: Ksh ${(totalAmount + vat - discount).toFixed(2)}
      Payment: ${saleData.payment_type}
      -------------------------------
      Thank you for shopping with us!
    `;

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`<pre>${receipt}</pre>`);
        printWindow.document.close();
        printWindow.print();
      }
    } else {
      Alert.alert("Receipt", receipt, [{ text: "OK" }]);
      // For mobile, you might want to use a library like react-native-print
      // or send to a thermal printer via Bluetooth
    }
  };

  /* ---------------- Calculations ---------------- */
  const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
  const vatAmount = cartTotal * vatRate;
  const finalTotal = cartTotal + vatAmount - discount;

  /* ---------------- UI ---------------- */
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sales</Text>
        <TouchableOpacity onPress={() => setCartOpen(true)}>
          <Icon name="cart" size={26} color="#F5A100" />
          {cart.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search products..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {/* Customer Selection Button */}
      <TouchableOpacity
        style={styles.customerButton}
        onPress={() => {
          fetchCustomers();
          setCustomerModal(true);
        }}
      >
        <Icon name="account" size={20} color="#0B1446" />
        <Text style={styles.customerButtonText}>
          {selectedCustomer ? selectedCustomer.name : "Select Customer"}
        </Text>
      </TouchableOpacity>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={(item) => item.product_id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => addToCart(item)}>
            <Icon name="cube-outline" size={28} color="#0B1446" />
            <Text style={styles.productName}>{item.product_name}</Text>
            {item.is_bundle && <Text style={styles.bundle}>Bundle</Text>}
            <Text style={styles.price}>Ksh {item.product_price}</Text>
            <Text
              style={[
                styles.stock,
                { color: item.product_stock < 1 ? "#F44336" : "#2e7d32" },
              ]}
            >
              {item.product_stock < 1
                ? "Out of stock"
                : `Stock: ${item.product_stock}`}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Customer Modal */}
      <Modal visible={customerModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCustomerModal(false)}>
              <Icon name="arrow-left" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {addingCustomer ? "Add Customer" : "Select Customer"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {addingCustomer ? (
            <ScrollView style={styles.formContainer}>
              <TextInput
                placeholder="Name *"
                value={newCustomer.name}
                onChangeText={(text) =>
                  setNewCustomer({ ...newCustomer, name: text })
                }
                style={styles.input}
              />
              <TextInput
                placeholder="Phone"
                value={newCustomer.phone}
                onChangeText={(text) =>
                  setNewCustomer({ ...newCustomer, phone: text })
                }
                style={styles.input}
                keyboardType="phone-pad"
              />
              <TextInput
                placeholder="Email"
                value={newCustomer.email}
                onChangeText={(text) =>
                  setNewCustomer({ ...newCustomer, email: text })
                }
                style={styles.input}
                keyboardType="email-address"
              />
              <TextInput
                placeholder="Address"
                value={newCustomer.address}
                onChangeText={(text) =>
                  setNewCustomer({ ...newCustomer, address: text })
                }
                style={styles.input}
                multiline
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddCustomer}
              >
                <Text style={styles.saveButtonText}>Save Customer</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <>
              <TextInput
                placeholder="Search customers..."
                value={customerSearch}
                onChangeText={setCustomerSearch}
                style={styles.searchInput}
              />
              <FlatList
                data={customers
                  .filter((customer) => customer?.id != null)
                  .filter((customer) =>
                    (customer.name || "")
                      .toLowerCase()
                      .includes(customerSearch.toLowerCase()),
                  )}
                keyExtractor={(item, index) =>
                  item?.id?.toString() ?? index.toString()
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.customerItem}
                    onPress={() => {
                      setSelectedCustomer(item);
                      setCustomerModal(false);
                    }}
                  >
                    <Icon name="account-circle" size={40} color="#0B1446" />
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{item.name}</Text>
                      <Text style={styles.customerPhone}>
                        {item.phone || "No phone"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.addCustomerButton}
                onPress={() => setAddingCustomer(true)}
              >
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.addCustomerButtonText}>Add Customer</Text>
              </TouchableOpacity>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Cart Modal */}
      <Modal visible={cartOpen} animationType="slide">
        <SafeAreaView style={styles.cartModal}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart</Text>
            <TouchableOpacity onPress={() => setCartOpen(false)}>
              <Icon name="close" size={26} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={cart}
            keyExtractor={(item) => item.product_id.toString()}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.product_name}</Text>
                  {item.is_bundle && (
                    <Text style={styles.bundleSmall}>Bundle</Text>
                  )}
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      onPress={() =>
                        updateCartQuantity(item.product_id, item.quantity - 1)
                      }
                    >
                      <Icon name="minus-circle" size={20} color="#F44336" />
                    </TouchableOpacity>
                    <TextInput
                      value={item.quantity.toString()}
                      onChangeText={(text) =>
                        updateCartQuantity(item.product_id, parseInt(text) || 1)
                      }
                      style={styles.qtyInput}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      onPress={() =>
                        updateCartQuantity(item.product_id, item.quantity + 1)
                      }
                    >
                      <Icon name="plus-circle" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.cartItemRight}>
                  <Text style={styles.cartItemPrice}>
                    Ksh {item.subtotal.toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeFromCart(item.product_id)}
                  >
                    <Icon name="delete" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          <View style={styles.cartFooter}>
            {/* VAT & Discount */}
            <View style={styles.vatDiscountContainer}>
              <View style={styles.vatDiscountRow}>
                <Text>VAT Rate (%):</Text>
                <TextInput
                  value={(vatRate * 100).toFixed(0)}
                  onChangeText={(text) => setVatRate(parseFloat(text) / 100)}
                  style={styles.smallInput}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.vatDiscountRow}>
                <Text>Discount (Ksh):</Text>
                <TextInput
                  value={discount.toString()}
                  onChangeText={(text) => setDiscount(parseFloat(text) || 0)}
                  style={styles.smallInput}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Totals */}
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text>Subtotal:</Text>
                <Text>Ksh {cartTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>VAT:</Text>
                <Text>Ksh {vatAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>Discount:</Text>
                <Text>Ksh {discount.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, styles.finalTotal]}>
                <Text style={styles.finalTotalText}>Total:</Text>
                <Text style={styles.finalTotalText}>
                  Ksh {finalTotal.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Payment Type */}
            <View style={styles.paymentContainer}>
              <Text>Payment Type:</Text>
              <View style={styles.paymentButtons}>
                {["Mpesa", "Cash", "Bank"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.paymentButton,
                      paymentType === type && styles.paymentButtonActive,
                    ]}
                    onPress={() => setPaymentType(type)}
                  >
                    <Text
                      style={[
                        styles.paymentButtonText,
                        paymentType === type && styles.paymentButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Checkout Button */}
            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                (!selectedCustomer || cart.length === 0) &&
                  styles.checkoutBtnDisabled,
              ]}
              onPress={handleCheckout}
              disabled={!selectedCustomer || cart.length === 0}
            >
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.checkoutText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9f9f9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0B1446",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#F44336",
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 12 },
  search: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 12,
    borderRadius: 10,
  },
  customerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  customerButtonText: {
    color: "#0B1446",
    fontWeight: "500",
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    margin: 6,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    elevation: 3,
  },
  productName: {
    fontWeight: "bold",
    marginTop: 8,
    color: "#0B1446",
    textAlign: "center",
  },
  price: {
    marginVertical: 6,
    fontWeight: "bold",
  },
  bundle: {
    backgroundColor: "#F5A100",
    color: "#fff",
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 4,
    fontSize: 12,
  },
  stock: {
    fontWeight: "bold",
  },

  // Customer Modal Styles
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  searchInput: {
    backgroundColor: "#f5f5f5",
    margin: 12,
    padding: 12,
    borderRadius: 10,
  },
  customerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  customerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  customerName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  customerPhone: {
    color: "#666",
    marginTop: 4,
  },
  addCustomerButton: {
    flexDirection: "row",
    backgroundColor: "#0B1446",
    margin: 16,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addCustomerButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Form Styles
  formContainer: {
    padding: 16,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#0B1446",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Cart Modal Styles
  cartModal: { flex: 1, backgroundColor: "#fff" },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  bundleSmall: {
    backgroundColor: "#F5A100",
    color: "#fff",
    paddingHorizontal: 6,
    borderRadius: 6,
    fontSize: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  qtyInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 4,
    width: 40,
    textAlign: "center",
  },
  cartItemRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  cartItemPrice: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },
  cartFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  vatDiscountContainer: {
    marginBottom: 16,
  },
  vatDiscountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    width: 80,
    textAlign: "center",
  },
  totalsContainer: {
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  finalTotal: {
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingTop: 8,
    marginTop: 8,
  },
  finalTotalText: {
    fontWeight: "bold",
    fontSize: 18,
  },
  paymentContainer: {
    marginBottom: 16,
  },
  paymentButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  paymentButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  paymentButtonActive: {
    backgroundColor: "#0B1446",
    borderColor: "#0B1446",
  },
  paymentButtonText: {
    color: "#666",
  },
  paymentButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  checkoutBtn: {
    backgroundColor: "#0B1446",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  checkoutBtnDisabled: {
    backgroundColor: "#ccc",
  },
  checkoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default SalesMobile;
