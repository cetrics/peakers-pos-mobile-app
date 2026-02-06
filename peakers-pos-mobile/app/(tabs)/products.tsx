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
  ActivityIndicator,
  Platform,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { Dimensions } from "react-native";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";

const { width: screenWidth } = Dimensions.get("window");

const CARD_MARGIN = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH =
  (screenWidth - CARD_MARGIN * (NUM_COLUMNS * 2)) / NUM_COLUMNS;

const API = "http://192.168.1.66:5000";

type Product = {
  product_id: number | string;
  product_name: string;
  product_price: string | number;
  buying_price: string | number;
  product_stock: number;
  category_name?: string;
  category_id_fk?: number; // ✅ Add this line
  product_description?: string;
  product_number?: string;
  unit?: string;
  expiry_date?: string;
  is_bundle?: boolean;
  items?: any[];
  products_count?: number;
  ingredients_count?: number;
};

type Category = {
  category_id: number;
  category_name: string;
};

type Material = {
  material_id: number;
  material_name: string;
  unit: string;
};

// Define response types
type ProductsResponse = {
  total_products: number;
  products: Product[];
};

type BundleResponse = Array<{
  bundle_id: number;
  product_name: string;
  product_price: number;
  buying_price: number;
  product_stock: number;
  items: any[];
  products_count: number;
}>;

type CategoriesResponse = {
  categories: Category[];
};

type MaterialsResponse = {
  materials: Material[];
};

type RecipeResponse = {
  recipe: any[];
};

const ProductsMobile = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalType, setModalType] = useState<
    "product" | "category" | "recipe" | null
  >(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Product modal states
  const [productData, setProductData] = useState({
    product_number: "",
    product_name: "",
    product_price: "",
    buying_price: "0",
    product_description: "",
    product_stock: "0",
    category_id_fk: "",
    unit: "",
    expiry_date: "",
    reorder_threshold: 5,
  });
  const [isBundle, setIsBundle] = useState(false);
  const [bundleItems, setBundleItems] = useState<any[]>([]);
  const [bundleSellingPrice, setBundleSellingPrice] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([]);

  // Category modal state
  const [categoryName, setCategoryName] = useState("");

  // Recipe modal state
  const [recipe, setRecipe] = useState<any[]>([]);

  /* ---------------- Fetch Data ---------------- */
  useFocusEffect(
    React.useCallback(() => {
      fetchAllProducts();
      fetchCategories();
      fetchMaterials();

      return () => {
        // Cleanup if needed
      };
    }, []),
  );

  const fetchAllProducts = async () => {
    setIsLoading(true);
    try {
      // Fetch regular products
      const initialResponse = await axios.get<ProductsResponse>(
        `${API}/get-products?page=1`,
      );
      const totalProducts = initialResponse.data.total_products;
      const productsPerPage = initialResponse.data.products.length;
      const totalPages = Math.ceil(totalProducts / productsPerPage);
      const refreshProducts = () => {
        fetchAllProducts();
        fetchCategories();
        fetchMaterials();
      };

      let allProducts: Product[] = [];
      for (let page = 1; page <= totalPages; page++) {
        const response = await axios.get<ProductsResponse>(
          `${API}/get-products?page=${page}`,
        );
        allProducts = [...allProducts, ...response.data.products];
      }

      // Fetch bundles
      const bundleRes = await axios.get<BundleResponse>(`${API}/get-bundles`);
      const bundles: Product[] = bundleRes.data.map((bundle) => ({
        product_id: `bundle-${bundle.bundle_id}`,
        product_name: bundle.product_name,
        product_price: bundle.product_price,
        buying_price: bundle.buying_price,
        product_stock: bundle.product_stock,
        category_name: "Bundle",
        is_bundle: true,
        items: bundle.items,
        products_count: bundle.products_count,
      }));

      // Merge
      const combined = [...allProducts, ...bundles];
      setProducts(combined);
      setFilteredProducts(combined);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get<CategoriesResponse>(
        `${API}/get-categories?_=${Date.now()}`,
      );
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await axios.get<MaterialsResponse>(`${API}/get-materials`);
      setMaterials(res.data.materials);
    } catch (err) {
      console.error("Failed to fetch materials", err);
    }
  };

  /* ---------------- Search ---------------- */
  useEffect(() => {
    if (!search) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(
      (product) =>
        product.product_name.toLowerCase().includes(search.toLowerCase()) ||
        product.product_description
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        product.category_name?.toLowerCase().includes(search.toLowerCase()),
    );
    setFilteredProducts(filtered);
  }, [search, products]);

  /* ---------------- Product Modal Functions ---------------- */
  const openProductModal = (product: Product | null = null) => {
    resetProductForm(); // <-- reset all modal-related state

    setSelectedProduct(product);

    if (product) {
      setProductData({
        product_number: product.product_number || "",
        product_name: product.product_name || "",
        product_price: product.product_price?.toString() || "",
        buying_price: "0",
        product_description: product.product_description || "",
        product_stock: product.product_stock?.toString() || "0",
        category_id_fk: product.category_id_fk?.toString() || "",
        unit: product.unit || "",
        expiry_date: product.expiry_date?.toString().slice(0, 10) || "",
        reorder_threshold: 5,
      });

      if (product.is_bundle) {
        setIsBundle(true);
        setBundleSellingPrice(product.product_price?.toString() || "");
        setBundleItems(product.items || []);
      }
    }

    setModalType("product");
    setModalVisible(true);
  };

  const openCategoryModal = () => {
    setCategoryName("");
    setModalType("category");
    setModalVisible(true);
  };

  const openRecipeModal = async (product: Product) => {
    setRecipe([]); // reset ingredients first
    setSelectedProduct(product);

    try {
      const res = await axios.get<RecipeResponse>(
        `${API}/get-recipe/${product.product_id}`,
      );
      setRecipe(res.data.recipe || []);
      setModalType("recipe");
      setModalVisible(true);
    } catch (err) {
      Alert.alert("Error", "Failed to load recipe");
    }
  };

  const resetProductForm = () => {
    setProductData({
      product_number: "",
      product_name: "",
      product_price: "",
      buying_price: "0",
      product_description: "",
      product_stock: "0",
      category_id_fk: "",
      unit: "",
      expiry_date: "",
      reorder_threshold: 5,
    });
    setIsBundle(false);
    setBundleItems([]);
    setBundleSellingPrice("");
    setSelectedMaterials([]);
  };

  const handleSaveProduct = async () => {
    try {
      if (isBundle) {
        const bundlePayload = {
          bundle_items: bundleItems,
          selling_price: parseFloat(bundleSellingPrice),
        };

        if (selectedProduct?.is_bundle) {
          await axios.put(
            `${API}/update-bundle/${selectedProduct.product_id.toString().replace("bundle-", "")}`,
            bundlePayload,
          );
          Alert.alert("Success", "Bundle updated successfully!");
        } else {
          await axios.post(`${API}/add-bundle`, bundlePayload);
          Alert.alert("Success", "Bundle added successfully!");
        }
      } else {
        const productPayload = {
          ...productData,
          buying_price: 0,
          product_price: parseFloat(productData.product_price),
          ingredients: selectedMaterials,
        };

        if (selectedProduct) {
          await axios.put(
            `${API}/updating-product/${selectedProduct.product_id}`,
            productPayload,
          );
          Alert.alert("Success", "Product updated successfully!");
        } else {
          await axios.post(`${API}/add-product`, productPayload);
          Alert.alert("Success", "Product added successfully!");
        }
      }

      fetchAllProducts();
      setModalVisible(false);
    } catch (error: any) {
      const message = error.response?.data?.error || "Error saving product";
      Alert.alert("Error", message);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    try {
      await axios.post(`${API}/add-category`, { category_name: categoryName });
      Alert.alert("Success", "Category added successfully!");
      fetchCategories();
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to add category",
      );
    }
  };

  const handleSaveRecipe = async () => {
    if (!selectedProduct) return;

    const validMaterials = recipe
      .filter((item) => !isNaN(item.quantity) && item.quantity >= 0)
      .map(({ material_id, quantity }) => ({
        material_id,
        quantity: parseFloat(quantity),
      }));

    if (validMaterials.length === 0) {
      Alert.alert(
        "Warning",
        "Please enter at least one valid ingredient quantity",
      );
      return;
    }

    try {
      await axios.post(`${API}/add-recipe`, {
        product_id: selectedProduct.product_id,
        materials: validMaterials,
      });
      Alert.alert("Success", "Recipe updated successfully!");
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to save recipe",
      );
    }
  };

  /* ---------------- Render Functions ---------------- */
  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openProductModal(item)}
    >
      {item.is_bundle && (
        <View style={styles.bundleBadge}>
          <Text style={styles.bundleBadgeText}>Bundle</Text>
        </View>
      )}

      <Icon name="cube-outline" size={24} color="#0B1446" />
      <Text style={styles.productName} numberOfLines={1}>
        {item.product_name}
      </Text>

      <Text style={styles.price}>💰 Ksh {item.product_price}</Text>

      <Text style={styles.buyingPrice}>📊 Ksh {item.buying_price}</Text>

      {item.is_bundle && (
        <Text style={styles.bundleCount}>
          🧩 {item.products_count} products
        </Text>
      )}

      <Text
        style={[
          styles.stock,
          { color: item.product_stock < 1 ? "#F44336" : "#0B1446" },
        ]}
      >
        📦{" "}
        {item.product_stock < 1
          ? "Out of stock"
          : `Stock: ${item.product_stock}`}
      </Text>

      <Text style={styles.category}>🗂 {item.category_name || "N/A"}</Text>

      {!!item.ingredients_count && item.ingredients_count > 0 && (
        <TouchableOpacity
          style={styles.recipeButton}
          onPress={() => openRecipeModal(item)}
        >
          <Text style={styles.recipeButtonText}>🍳 Add Material</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderProductModal = () => (
    <Modal
      visible={modalVisible && modalType === "product"}
      animationType="slide"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Icon name="arrow-left" size={24} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {selectedProduct ? "Edit" : "Add"} {isBundle ? "Bundle" : "Product"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.formContainer}>
          {!selectedProduct && (
            <View style={styles.checkboxContainer}>
              <Text>This product is a bundle / crate</Text>
              <TouchableOpacity
                style={[styles.checkbox, isBundle && styles.checkboxChecked]}
                onPress={() => setIsBundle(!isBundle)}
              >
                {isBundle && <Icon name="check" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          )}

          {!isBundle ? (
            <>
              <TextInput
                placeholder="Product Number"
                value={productData.product_number}
                onChangeText={(text) =>
                  setProductData({ ...productData, product_number: text })
                }
                style={styles.input}
              />
              <TextInput
                placeholder="Product Name *"
                value={productData.product_name}
                onChangeText={(text) =>
                  setProductData({ ...productData, product_name: text })
                }
                style={styles.input}
              />
              <TextInput
                placeholder="Selling Price *"
                value={productData.product_price}
                onChangeText={(text) =>
                  setProductData({ ...productData, product_price: text })
                }
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                placeholder="Description"
                value={productData.product_description}
                onChangeText={(text) =>
                  setProductData({ ...productData, product_description: text })
                }
                style={[styles.input, styles.textArea]}
                multiline
              />
              <TextInput
                placeholder="Unit (e.g., kg, pcs)"
                value={productData.unit}
                onChangeText={(text) =>
                  setProductData({ ...productData, unit: text })
                }
                style={styles.input}
              />
              {/* Expiry Date Picker */}
              <Text style={styles.inputLabel}>Expiry Date (Optional)</Text>
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
                  {productData.expiry_date
                    ? dayjs(productData.expiry_date).format("MMM D, YYYY")
                    : "Select expiry date"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>Select Category</Text>
              <ScrollView horizontal style={styles.categoryScroll}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.category_id}
                    style={[
                      styles.categoryChip,
                      productData.category_id_fk ===
                        category.category_id.toString() &&
                        styles.categoryChipSelected,
                    ]}
                    onPress={() =>
                      setProductData({
                        ...productData,
                        category_id_fk: category.category_id.toString(),
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        productData.category_id_fk ===
                          category.category_id.toString() &&
                          styles.categoryChipTextSelected,
                      ]}
                    >
                      {category.category_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>Materials (Optional)</Text>
              {materials.map((mat) => (
                <View key={mat.material_id} style={styles.materialItem}>
                  <Text>{mat.material_name}</Text>
                  <TouchableOpacity
                    style={[
                      styles.materialCheckbox,
                      selectedMaterials.includes(mat.material_id) &&
                        styles.materialCheckboxChecked,
                    ]}
                    onPress={() => {
                      setSelectedMaterials((prev) =>
                        prev.includes(mat.material_id)
                          ? prev.filter((id) => id !== mat.material_id)
                          : [...prev, mat.material_id],
                      );
                    }}
                  >
                    {selectedMaterials.includes(mat.material_id) && (
                      <Icon name="check" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : (
            <>
              <TextInput
                placeholder="Bundle Selling Price *"
                value={bundleSellingPrice}
                onChangeText={setBundleSellingPrice}
                style={styles.input}
                keyboardType="numeric"
              />
              <Text style={styles.sectionTitle}>
                Select Products for Bundle
              </Text>
              {products
                .filter(
                  (p) =>
                    !p.is_bundle &&
                    p.product_id !== selectedProduct?.product_id,
                )
                .map((p) => (
                  <View key={p.product_id} style={styles.bundleProductItem}>
                    <TouchableOpacity
                      style={[
                        styles.bundleCheckbox,
                        bundleItems.some(
                          (item) => item.product_id === p.product_id,
                        ) && styles.bundleCheckboxChecked,
                      ]}
                      onPress={() => {
                        setBundleItems((prev) =>
                          prev.some((item) => item.product_id === p.product_id)
                            ? prev.filter(
                                (item) => item.product_id !== p.product_id,
                              )
                            : [
                                ...prev,
                                { product_id: p.product_id, quantity: 1 },
                              ],
                        );
                      }}
                    >
                      {bundleItems.some(
                        (item) => item.product_id === p.product_id,
                      ) && <Icon name="check" size={16} color="#fff" />}
                    </TouchableOpacity>
                    <Text style={styles.bundleProductName}>
                      {p.product_name}
                    </Text>
                    {bundleItems.some(
                      (item) => item.product_id === p.product_id,
                    ) && (
                      <TextInput
                        placeholder="Qty"
                        value={
                          bundleItems
                            .find((item) => item.product_id === p.product_id)
                            ?.quantity?.toString() || "1"
                        }
                        onChangeText={(text) => {
                          const qty = parseInt(text) || 1;
                          setBundleItems((prev) =>
                            prev.map((item) =>
                              item.product_id === p.product_id
                                ? { ...item, quantity: qty }
                                : item,
                            ),
                          );
                        }}
                        style={styles.quantityInput}
                        keyboardType="numeric"
                      />
                    )}
                  </View>
                ))}
            </>
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProduct}
          >
            <Text style={styles.saveButtonText}>
              {selectedProduct ? "Update" : "Add"}{" "}
              {isBundle ? "Bundle" : "Product"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={modalVisible && modalType === "category"}
      animationType="slide"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Icon name="arrow-left" size={24} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Category</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formContainer}>
          <TextInput
            placeholder="Category Name"
            value={categoryName}
            onChangeText={setCategoryName}
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleAddCategory}
          >
            <Text style={styles.saveButtonText}>Add Category</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderRecipeModal = () => (
    <Modal
      visible={modalVisible && modalType === "recipe"}
      animationType="slide"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Icon name="arrow-left" size={24} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            Recipe: {selectedProduct?.product_name}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.formContainer}>
          {recipe.length === 0 ? (
            <Text style={styles.emptyMessage}>No ingredients selected</Text>
          ) : (
            recipe.map((mat) => (
              <View key={mat.material_id} style={styles.recipeItem}>
                <Text style={styles.recipeMaterialName}>
                  {mat.material_name} ({mat.unit})
                </Text>
                <TextInput
                  placeholder="Quantity"
                  value={mat.quantity?.toString()}
                  onChangeText={(text) => {
                    const quantity = parseFloat(text) || 0;
                    setRecipe((prev) =>
                      prev.map((item) =>
                        item.material_id === mat.material_id
                          ? { ...item, quantity }
                          : item,
                      ),
                    );
                  }}
                  style={styles.quantityInput}
                  keyboardType="numeric"
                />
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveRecipe}
          >
            <Text style={styles.saveButtonText}>Save Recipe</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={openCategoryModal}
            style={styles.iconButton}
          >
            <Icon name="tag-plus" size={24} color="#0B1446" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openProductModal()}
            style={styles.iconButton}
          >
            <Icon name="plus-circle" size={24} color="#0B1446" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/suppliers/detail")}
            style={styles.iconButton}
          >
            <Icon name="truck-outline" size={24} color="#0B1446" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search products..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      {/* Loading */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3d8085" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        /* Product Grid */
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(item) => item.product_id.toString()}
          contentContainerStyle={{
            paddingHorizontal: CARD_MARGIN, // <-- add padding here
            paddingBottom: 80,
          }}
          renderItem={renderProductCard}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products found</Text>
          }
        />
      )}

      {/* Modals */}
      {renderProductModal()}
      {renderCategoryModal()}
      {renderRecipeModal()}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={
            productData.expiry_date
              ? new Date(productData.expiry_date)
              : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setProductData({
                ...productData,
                expiry_date: selectedDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
              });
            }
          }}
          minimumDate={new Date()} // Optional: prevent selecting past dates
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0B1446", // Orders theme
  },
  headerActions: {
    flexDirection: "row",
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  search: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  reportButtons: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1446", // Orders theme
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    gap: 6,
  },
  reportButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
  },
  productGrid: {
    padding: 12,
    paddingBottom: 80,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    margin: CARD_MARGIN / 2,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#eee",
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
    marginTop: 8,
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
  bundleBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#F5A100",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bundleBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  productName: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    color: "#0B1446", // Changed to Orders theme
    marginBottom: 2,
  },
  buyingPrice: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  bundleCount: {
    fontSize: 12,
    color: "#F5A100",
    marginBottom: 2,
  },
  stock: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  recipeButton: {
    backgroundColor: "#e3f2fd",
    padding: 6,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
  },
  recipeButtonText: {
    fontSize: 12,
    color: "#1976d2",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 40,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  formContainer: {
    padding: 16,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  sectionTitle: {
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
  },
  checkboxContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#3d8085",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#0B1446", // Orders theme
  },
  categoryScroll: {
    flexDirection: "row",
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: "#0B1446", // Orders theme
  },
  categoryChipText: {
    color: "#666",
  },
  categoryChipTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  materialItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  materialCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#0B1446", // Orders theme
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  materialCheckboxChecked: {
    backgroundColor: "#0B1446", // Orders theme
  },
  bundleProductItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  bundleCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#0B1446", // Orders theme
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bundleCheckboxChecked: {
    backgroundColor: "#0B1446", // Orders theme
  },
  bundleProductName: {
    flex: 1,
    fontSize: 14,
  },
  quantityInput: {
    width: 60,
    padding: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    textAlign: "center",
  },
  recipeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  recipeMaterialName: {
    fontSize: 14,
    flex: 1,
  },
  emptyMessage: {
    textAlign: "center",
    color: "#666",
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: "#0B1446", // Orders theme
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
export default ProductsMobile;
