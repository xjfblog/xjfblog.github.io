// 库存预警组件
Vue.component('inventory-warning-component', {
    template: `
        <div class="inventory-warning">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="16">
                            <el-form :inline="true" :model="queryForm">
                                <el-form-item label="商品名称">
                                    <el-input 
                                        v-model="queryForm.name" 
                                        placeholder="请输入商品名称"
                                        clearable>
                                    </el-input>
                                </el-form-item>
                                <el-form-item label="商品分类">
                                    <el-select 
                                        v-model="queryForm.category" 
                                        placeholder="请选择分类"
                                        clearable>
                                        <el-option
                                            v-for="category in categories"
                                            :key="category"
                                            :label="category"
                                            :value="category">
                                        </el-option>
                                    </el-select>
                                </el-form-item>
                                <el-form-item label="预警级别">
                                    <el-select 
                                        v-model="queryForm.level" 
                                        placeholder="请选择级别"
                                        clearable>
                                        <el-option label="紧急" value="danger"></el-option>
                                        <el-option label="警告" value="warning"></el-option>
                                    </el-select>
                                </el-form-item>
                            </el-form>
                        </el-col>
                        <el-col :span="8" style="text-align: right;">
                            <el-button type="primary" @click="handleBatchPurchase">批量采购</el-button>
                            <el-button type="success" @click="exportWarning">导出预警</el-button>
                        </el-col>
                    </el-row>
                </div>

                <!-- 预警统计卡片 -->
                <el-row :gutter="20" style="margin-bottom: 20px;">
                    <el-col :span="8">
                        <el-card shadow="hover">
                            <div slot="header">预警商品总数</div>
                            <div class="amount-text red-text">{{ warningProducts.length }} 个</div>
                        </el-card>
                    </el-col>
                    <el-col :span="8">
                        <el-card shadow="hover">
                            <div slot="header">紧急预警</div>
                            <div class="amount-text red-text">{{ dangerCount }} 个</div>
                        </el-card>
                    </el-col>
                    <el-col :span="8">
                        <el-card shadow="hover">
                            <div slot="header">一般预警</div>
                            <div class="amount-text warning-text">{{ warningCount }} 个</div>
                        </el-card>
                    </el-col>
                </el-row>

                <!-- 预警商品列表 -->
                <el-table :data="filteredProducts" stripe border>
                    <el-table-column type="selection" width="55"></el-table-column>
                    <el-table-column prop="id" label="商品编号" width="100"></el-table-column>
                    <el-table-column prop="name" label="商品名称"></el-table-column>
                    <el-table-column prop="category" label="分类" width="120"></el-table-column>
                    <el-table-column label="当前库存" width="120">
                        <template slot-scope="scope">
                            <span :class="getStockClass(scope.row.stock)">
                                {{ scope.row.stock }}{{ scope.row.unit }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="预警阈值" width="120">
                        <template slot-scope="scope">
                            {{ systemConfig.stockWarningLimit }}{{ scope.row.unit }}
                        </template>
                    </el-table-column>
                    <el-table-column label="建议采购" width="120">
                        <template slot-scope="scope">
                            {{ getSuggestedPurchase(scope.row) }}{{ scope.row.unit }}
                        </template>
                    </el-table-column>
                    <el-table-column label="预警级别" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getWarningType(scope.row.stock)">
                                {{ getWarningText(scope.row.stock) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="150" fixed="right">
                        <template slot-scope="scope">
                            <el-button 
                                size="mini" 
                                type="primary"
                                @click="handlePurchase(scope.row)">采购</el-button>
                            <el-button 
                                size="mini" 
                                @click="viewHistory(scope.row)">记录</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 采购对话框 -->
            <el-dialog 
                title="商品采购" 
                :visible.sync="purchaseDialogVisible"
                width="30%">
                <el-form :model="purchaseForm" :rules="rules" ref="purchaseForm" label-width="100px">
                    <el-form-item label="商品名称">
                        <span>{{ purchaseForm.productName }}</span>
                    </el-form-item>
                    <el-form-item label="当前库存">
                        <span>{{ purchaseForm.currentStock }}{{ purchaseForm.unit }}</span>
                    </el-form-item>
                    <el-form-item label="采购数量" prop="quantity">
                        <el-input-number 
                            v-model="purchaseForm.quantity" 
                            :min="1">
                        </el-input-number>
                    </el-form-item>
                    <el-form-item label="供应商" prop="supplierId">
                        <el-select v-model="purchaseForm.supplierId" placeholder="请选择供应商">
                            <el-option
                                v-for="supplier in suppliers"
                                :key="supplier.id"
                                :label="supplier.name"
                                :value="supplier.id">
                            </el-option>
                        </el-select>
                    </el-form-item>
                    <el-form-item label="备注" prop="remark">
                        <el-input type="textarea" v-model="purchaseForm.remark"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="purchaseDialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="confirmPurchase">确 定</el-button>
                </div>
            </el-dialog>

            <!-- 库存记录对话框 -->
            <el-dialog 
                title="库存变动记录" 
                :visible.sync="historyDialogVisible"
                width="70%">
                <el-table :data="stockHistory" stripe>
                    <el-table-column prop="date" label="日期" width="120"></el-table-column>
                    <el-table-column prop="type" label="类型" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getHistoryType(scope.row.type)">
                                {{ scope.row.type }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="documentNo" label="单据编号" width="160"></el-table-column>
                    <el-table-column label="变动数量" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': scope.row.quantity < 0, 'green-text': scope.row.quantity > 0}">
                                {{ scope.row.quantity > 0 ? '+' : '' }}{{ scope.row.quantity }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="库存余额" width="120">
                        <template slot-scope="scope">
                            {{ scope.row.balance }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="remark" label="备注"></el-table-column>
                </el-table>
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
            queryForm: {
                name: '',
                category: '',
                level: ''
            },
            purchaseDialogVisible: false,
            historyDialogVisible: false,
            purchaseForm: {
                productId: null,
                productName: '',
                currentStock: 0,
                unit: '',
                quantity: 1,
                supplierId: null,
                remark: ''
            },
            stockHistory: [],
            rules: {
                quantity: [
                    { required: true, message: '请输入采购数量', trigger: 'blur' },
                    { type: 'number', min: 1, message: '采购数量必须大于0', trigger: 'blur' }
                ],
                supplierId: [
                    { required: true, message: '请选择供应商', trigger: 'change' }
                ]
            }
        }
    },

    computed: {
        // 获取所有商品分类
        categories() {
            return [...new Set(this.systemData.products.map(p => p.category))];
        },

        // 获取所有供应商
        suppliers() {
            return this.systemData.suppliers;
        },

        // 获取所有预警商品
        warningProducts() {
            return this.systemData.products.filter(product => 
                product.stock <= this.systemConfig.stockWarningLimit
            );
        },

        // 根据条件筛选商品
        filteredProducts() {
            return this.warningProducts.filter(product => {
                // 名称筛选
                if (this.queryForm.name && 
                    !product.name.toLowerCase().includes(this.queryForm.name.toLowerCase())) {
                    return false;
                }
                
                // 分类筛选
                if (this.queryForm.category && product.category !== this.queryForm.category) {
                    return false;
                }

                // 预警级别筛选
                if (this.queryForm.level) {
                    const level = this.getWarningLevel(product.stock);
                    if (level !== this.queryForm.level) {
                        return false;
                    }
                }

                return true;
            });
        },

        // 紧急预警数量
        dangerCount() {
            return this.warningProducts.filter(
                product => product.stock <= this.systemConfig.stockDangerLimit
            ).length;
        },

        // 一般预警数量
        warningCount() {
            return this.warningProducts.filter(
                product => product.stock > this.systemConfig.stockDangerLimit && 
                          product.stock <= this.systemConfig.stockWarningLimit
            ).length;
        }
    },

    methods: {
        // 获取库存状态样式类
        getStockClass(stock) {
            if (stock <= this.systemConfig.stockDangerLimit) {
                return 'danger-stock';
            }
            if (stock <= this.systemConfig.stockWarningLimit) {
                return 'warning-stock';
            }
            return '';
        },

        // 获取预警类型
        getWarningType(stock) {
            if (stock <= this.systemConfig.stockDangerLimit) {
                return 'danger';
            }
            return 'warning';
        },

        // 获取预警文本
        getWarningText(stock) {
            if (stock <= this.systemConfig.stockDangerLimit) {
                return '紧急';
            }
            return '警告';
        },

        // 获取预警级别（用于筛选）
        getWarningLevel(stock) {
            if (stock <= this.systemConfig.stockDangerLimit) {
                return 'danger';
            }
            return 'warning';
        },

        // 获取建议采购数量
        getSuggestedPurchase(product) {
            // 建议采购到安全库存量的2倍
            const safeStock = this.systemConfig.stockWarningLimit * 2;
            return Math.max(0, safeStock - product.stock);
        },

        // 处理单个商品采购
        handlePurchase(product) {
            this.purchaseForm = {
                productId: product.id,
                productName: product.name,
                currentStock: product.stock,
                unit: product.unit,
                quantity: this.getSuggestedPurchase(product),
                supplierId: null,
                remark: '库存预警采购'
            };
            this.purchaseDialogVisible = true;
        },

        // 确认采购
        confirmPurchase() {
            this.$refs.purchaseForm.validate((valid) => {
                if (valid) {
                    // 创建采购订单
                    const order = {
                        id: Math.max(0, ...this.systemData.purchases.map(p => p.id)) + 1,
                        orderNo: `PO${moment().format('YYYYMMDD')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
                        supplierId: this.purchaseForm.supplierId,
                        orderDate: moment().format('YYYY-MM-DD'),
                        status: '未完成',
                        items: [{
                            productId: this.purchaseForm.productId,
                            productName: this.purchaseForm.productName,
                            quantity: this.purchaseForm.quantity,
                            price: 0, // 需要从供应商价格中获取
                            amount: 0
                        }],
                        totalAmount: 0,
                        remark: this.purchaseForm.remark
                    };

                    this.systemData.purchases.push(order);
                    this.$emit('data-change');
                    this.purchaseDialogVisible = false;
                    this.$message.success('采购单创建成功');
                }
            });
        },

        // 批量采购
        handleBatchPurchase() {
            const selection = this.$refs.table.selection;
            if (!selection.length) {
                this.$message.warning('请选择需要采购的商品');
                return;
            }

            // TODO: 实现批量采购逻辑
        },

        // 查看库存记录
        viewHistory(product) {
            // 收集所有相关的库存变动记录
            const history = [];
            let balance = 0;

            // 采购入库记录
            this.systemData.purchases
                .filter(order => order.status === '已完成')
                .forEach(order => {
                    order.items
                        .filter(item => item.productId === product.id)
                        .forEach(item => {
                            balance += item.quantity;
                            history.push({
                                date: order.orderDate,
                                type: '采购入库',
                                documentNo: order.orderNo,
                                quantity: item.quantity,
                                balance: balance,
                                remark: order.remark || ''
                            });
                        });
                });

            // 其他记录类型...（与库存查询组件相同）

            // 按日期排序
            this.stockHistory = history.sort((a, b) => new Date(a.date) - new Date(b.date));
            this.historyDialogVisible = true;
        },

        // 导出预警报表
        exportWarning() {
            // 生成CSV内容
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            csvContent += `库存预警报表 (${new Date().toLocaleDateString()})\n\n`;
            csvContent += `商品编号,商品名称,分类,当前库存,预警阈值,建议采购,预警级别\n`;

            this.filteredProducts.forEach(product => {
                csvContent += `${product.id},${product.name},${product.category},` +
                    `${product.stock}${product.unit},${this.systemConfig.stockWarningLimit}${product.unit},` +
                    `${this.getSuggestedPurchase(product)}${product.unit},` +
                    `${this.getWarningText(product.stock)}\n`;
            });

            csvContent += `\n预警统计\n`;
            csvContent += `预警商品总数,${this.warningProducts.length}\n`;
            csvContent += `紧急预警数量,${this.dangerCount}\n`;
            csvContent += `一般预警数量,${this.warningCount}\n`;

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `库存预警报表_${new Date().toLocaleDateString()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
}); 