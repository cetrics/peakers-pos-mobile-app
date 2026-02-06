import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { Platform } from "react-native";

type ProductsResponse = {
  products: Product[];
  total_products?: number;
};

const API = "http://192.168.1.66:5000";

type Product = {
  product_id: number;
  product_name: string;
  product_number: string;
};

const AddSupplierProductScreen = () => {
  const router = useRouter();
  const { supplierId } = useLocalSearchParams<{ supplierId: string }>();

  const [formData, setFormData] = useState({
    product_id: "",
    stock_supplied: "",
    price: "",
    supply_date: new Date().toISOString().split("T")[0], // Today's date as default
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Add type to axios.get
      const response = await axios.get<ProductsResponse>(`${API}/get-products`);
      setProducts(response.data.products || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load product list");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.product_id) {
      Alert.alert("Error", "Please select a product");
      return;
    }

    if (!formData.stock_supplied || parseFloat(formData.stock_supplied) <= 0) {
      Alert.alert("Error", "Please enter valid stock quantity");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert("Error", "Please enter valid price");
      return;
    }

    if (!formData.supply_date) {
      Alert.alert("Error", "Please select supply date");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/supplier-products/${supplierId}/add`, {
        ...formData,
        product_id: parseInt(formData.product_id),
        stock_supplied: parseInt(formData.stock_supplied),
        price: parseFloat(formData.price),
      });

      Alert.alert("Success", "Product added successfully!", [
        {
          text: "OK",
          onPress: () => {
            router.back();
            // You might want to refresh the parent screen here
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to add product",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B1446" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#0B1446" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Product</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Product Selection */}
        <Text style={styles.label}>Select Product *</Text>
        <View style={styles.productContainer}>
          {products.map((product) => (
            <TouchableOpacity
              key={product.product_id}
              style={[
                styles.productItem,
                formData.product_id === product.product_id.toString() &&
                  styles.productItemSelected,
              ]}
              onPress={() =>
                setFormData({
                  ...formData,
                  product_id: product.product_id.toString(),
                })
              }
            >
              <Icon
                name={
                  formData.product_id === product.product_id.toString()
                    ? "check-circle"
                    : "circle-outline"
                }
                size={20}
                color={
                  formData.product_id === product.product_id.toString()
                    ? "#0B1446"
                    : "#666"
                }
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.product_name}</Text>
                <Text style={styles.productNumber}>
                  {product.product_number}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stock Supplied */}
        <Text style={styles.label}>Stock Supplied *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter quantity"
          value={formData.stock_supplied}
          onChangeText={(text) =>
            setFormData({ ...formData, stock_supplied: text })
          }
          keyboardType="numeric"
        />

        {/* Price */}
        <Text style={styles.label}>Price (KSh) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter price"
          value={formData.price}
          onChangeText={(text) => setFormData({ ...formData, price: text })}
          keyboardType="numeric"
        />

        {/* Supply Date */}
        <Text style={styles.label}>Supply Date *</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon
            name="calendar"
            size={20}
            color="#666"
            style={styles.dateIcon}
          />
          <Text style={styles.dateText}>
            {dayjs(formData.supply_date).format("MMM D, YYYY")}
          </Text>
        </TouchableOpacity>
        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Product</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(formData.supply_date)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setFormData({
                ...formData,
                supply_date: selectedDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
              });
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0B1446",
    textAlign: "center",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  productContainer: {
    marginBottom: 12,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  productItemSelected: {
    backgroundColor: "#e8f4f8",
    borderColor: "#3d8085",
  },
  productInfo: {
    marginLeft: 12,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  productNumber: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
    fontStyle: "italic",
  },
  submitButton: {
    backgroundColor: "#0B1446",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
});

export default AddSupplierProductScreen;
