// 商品管理模块
Vue.component('product-component', {
    template: `
        <div class="product-management">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="8">
                            <el-button type="primary" @click="handleAdd">新增商品</el-button>
                        </el-col>
                        <el-col :span="8">
                            <el-input
                                placeholder="请输入商品名称搜索"
                                v-model="searchQuery"
                                clearable>
                                <i slot="prefix" class="el-icon-search"></i>
                            </el-input>
                        </el-col>
                    </el-row>
                </div>

                <!-- 商品列表 -->
                <el-table :data="filteredProducts" stripe border>
                    <el-table-column prop="id" label="商品编号" width="100"></el-table-column>
                    <el-table-column prop="name" label="商品名称"></el-table-column>
                    <el-table-column label="采购价" width="120">
                        <template slot-scope="scope">
                            ¥{{ Math.round(scope.row.purchasePrice) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="销售价" width="120">
                        <template slot-scope="scope">
                            ¥{{ Math.round(scope.row.salePrice) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="stock" label="库存" width="100">
                        <template slot-scope="scope">
                            <span :class="getStockClass(scope.row.stock)">
                                {{ scope.row.stock }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="200" fixed="right">
                        <template slot-scope="scope">
                            <el-button size="mini" @click="handleEdit(scope.row)">编辑</el-button>
                            <el-button 
                                size="mini" 
                                type="danger" 
                                @click="handleDelete(scope.row)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 商品编辑对话框 -->
            <el-dialog 
                :title="dialogTitle" 
                :visible.sync="dialogVisible"
                width="50%"
                @close="resetForm">
                <el-form 
                    :model="productForm" 
                    :rules="rules" 
                    ref="productForm" 
                    label-width="100px">
                    <el-form-item label="商品名称" prop="name">
                        <el-input v-model="productForm.name"></el-input>
                    </el-form-item>
                    <el-form-item label="采购价" prop="purchasePrice">
                        <el-input-number 
                            v-model="productForm.purchasePrice"
                            :min="0"
                            :precision="0"
                            style="width: 100%;">
                        </el-input-number>
                    </el-form-item>
                    <el-form-item label="销售价" prop="salePrice">
                        <el-input-number 
                            v-model="productForm.salePrice"
                            :min="0"
                            :precision="0"
                            style="width: 100%;">
                        </el-input-number>
                    </el-form-item>
                    <el-form-item label="初始库存" prop="stock" v-if="isNewProduct">
                        <el-input-number 
                            v-model="productForm.stock" 
                            :precision="0" 
                            :step="1" 
                            :min="0">
                        </el-input-number>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="dialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="handleSave">确 定</el-button>
                </div>
            </el-dialog>
        </div>
    `,

    props: {
        systemData: {
            type: Object,
            required: true
        },
        systemConfig: {
            type: Object,
            required: true
        }
    },

    data() {
        return {
            searchQuery: '',
            dialogVisible: false,
            isNewProduct: true,
            productForm: {
                id: null,
                name: '',
                purchasePrice: 0,
                salePrice: 0,
                stock: 0
            },
            rules: {
                name: [
                    { required: true, message: '请输入商品名称', trigger: 'blur' }
                ],
                purchasePrice: [
                    { required: true, message: '请输入采购价', trigger: 'blur' },
                    { type: 'number', min: 0, message: '采购价必须大于0', trigger: 'blur' }
                ],
                salePrice: [
                    { required: true, message: '请输入销售价', trigger: 'blur' },
                    { type: 'number', min: 0, message: '销售价必须大于0', trigger: 'blur' }
                ]
            }
        }
    },

    computed: {
        dialogTitle() {
            return this.isNewProduct ? '新增商品' : '编辑商品';
        },
        
        filteredProducts() {
            const query = this.searchQuery.toLowerCase();
            return this.systemData.products.filter(product => 
                product.name.toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query)
            );
        }
    },

    methods: {
        getEmptyProductForm() {
            return {
                id: null,
                name: '',
                purchasePrice: 0,
                salePrice: 0,
                stock: 0
            };
        },

        handleAdd() {
            this.isNewProduct = true;
            this.productForm = this.getEmptyProductForm();
            this.dialogVisible = true;
        },

        handleEdit(row) {
            this.isNewProduct = false;
            this.productForm = { ...row };
            this.dialogVisible = true;
        },

        handleDelete(row) {
            if (row.stock > 0) {
                this.$message.warning('该商品还有库存，不能删除');
                return;
            }
            
            this.$confirm('确认删除该商品吗？', '提示', {
                type: 'warning'
            }).then(() => {
                const index = this.systemData.products.findIndex(item => item.id === row.id);
                this.systemData.products.splice(index, 1);
                this.$emit('data-change');
                this.$message.success('删除成功');
            }).catch(() => {});
        },

        handleSave() {
            this.$refs.productForm.validate((valid) => {
                if (valid) {
                    if (this.isNewProduct) {
                        // 新增商品
                        const newId = Math.max(0, ...this.systemData.products.map(p => p.id)) + 1;
                        this.productForm.id = newId;
                        this.systemData.products.push({ ...this.productForm });
                    } else {
                        // 编辑商品
                        const index = this.systemData.products.findIndex(item => item.id === this.productForm.id);
                        this.systemData.products.splice(index, 1, { ...this.productForm });
                    }
                    this.$emit('data-change');
                    this.dialogVisible = false;
                    this.$message.success('保存成功');
                }
            });
        },

        resetForm() {
            this.$refs.productForm?.resetFields();
        },

        getStockClass(stock) {
            if (stock <= this.systemConfig.stockDangerLimit) {
                return 'danger-stock';
            }
            if (stock <= this.systemConfig.stockWarningLimit) {
                return 'warning-stock';
            }
            return '';
        }
    }
}); 