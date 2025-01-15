// 库存盘点组件
Vue.component('inventory-check-component', {
    template: `
        <div class="inventory-check">
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
                            </el-form>
                        </el-col>
                        <el-col :span="8" style="text-align: right;">
                            <el-button type="primary" @click="startBatchCheck">批量盘点</el-button>
                            <el-button type="success" @click="exportCheckHistory">导出盘点记录</el-button>
                        </el-col>
                    </el-row>
                </div>

                <!-- 商品列表 -->
                <el-table 
                    :data="filteredProducts" 
                    stripe 
                    border
                    :row-class-name="getRowClassName">
                    <el-table-column prop="id" label="商品编号" width="100"></el-table-column>
                    <el-table-column prop="name" label="商品名称"></el-table-column>
                    <el-table-column prop="category" label="分类" width="120"></el-table-column>
                    <el-table-column prop="spec" label="规格型号" width="120"></el-table-column>
                    <el-table-column label="系统库存" width="120">
                        <template slot-scope="scope">
                            {{ scope.row.stock }}{{ scope.row.unit }}
                        </template>
                    </el-table-column>
                    <el-table-column label="实际库存" width="150">
                        <template slot-scope="scope">
                            <el-input-number 
                                v-if="batchCheckMode"
                                v-model="scope.row.actualStock"
                                :min="0"
                                :controls="false"
                                size="mini">
                            </el-input-number>
                            <span v-else>{{ scope.row.stock }}{{ scope.row.unit }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="差异" width="120">
                        <template slot-scope="scope">
                            <span v-if="batchCheckMode" :class="getDiffClass(scope.row)">
                                {{ getDifference(scope.row) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="上次盘点" width="120">
                        <template slot-scope="scope">
                            {{ getLastCheckDate(scope.row) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="150" fixed="right">
                        <template slot-scope="scope">
                            <el-button 
                                size="mini" 
                                type="primary"
                                v-if="!batchCheckMode"
                                @click="handleCheck(scope.row)">盘点</el-button>
                            <el-button 
                                size="mini" 
                                @click="viewCheckHistory(scope.row)">记录</el-button>
                        </template>
                    </el-table-column>
                </el-table>

                <!-- 批量盘点操作按钮 -->
                <div v-if="batchCheckMode" style="margin-top: 20px; text-align: right;">
                    <el-button @click="cancelBatchCheck">取消</el-button>
                    <el-button type="primary" @click="confirmBatchCheck">确认盘点</el-button>
                </div>
            </el-card>

            <!-- 单个商品盘点对话框 -->
            <el-dialog 
                title="库存盘点" 
                :visible.sync="checkDialogVisible"
                width="30%">
                <el-form :model="checkForm" label-width="100px">
                    <el-form-item label="商品名称">
                        <span>{{ checkForm.productName }}</span>
                    </el-form-item>
                    <el-form-item label="系统库存">
                        <span>{{ checkForm.systemStock }}{{ checkForm.unit }}</span>
                    </el-form-item>
                    <el-form-item label="实际库存">
                        <el-input-number 
                            v-model="checkForm.actualStock" 
                            :min="0">
                        </el-input-number>
                    </el-form-item>
                    <el-form-item label="差异原因">
                        <el-input type="textarea" v-model="checkForm.reason"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="checkDialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="confirmCheck">确 定</el-button>
                </div>
            </el-dialog>

            <!-- 盘点记录对话框 -->
            <el-dialog 
                title="盘点记录" 
                :visible.sync="historyDialogVisible"
                width="70%">
                <el-table :data="checkHistory" stripe>
                    <el-table-column prop="date" label="盘点日期" width="120"></el-table-column>
                    <el-table-column label="系统库存" width="120">
                        <template slot-scope="scope">
                            {{ scope.row.systemStock }}{{ currentProduct?.unit }}
                        </template>
                    </el-table-column>
                    <el-table-column label="实际库存" width="120">
                        <template slot-scope="scope">
                            {{ scope.row.actualStock }}{{ currentProduct?.unit }}
                        </template>
                    </el-table-column>
                    <el-table-column label="差异数量" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': scope.row.difference < 0, 'green-text': scope.row.difference > 0}">
                                {{ scope.row.difference > 0 ? '+' : '' }}{{ scope.row.difference }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="reason" label="差异原因"></el-table-column>
                </el-table>
            </el-dialog>
        </div>
    `,

    props: {
        systemData: {
            type: Object,
            required: true
        }
    },

    data() {
        return {
            queryForm: {
                name: '',
                category: ''
            },
            batchCheckMode: false,
            checkDialogVisible: false,
            historyDialogVisible: false,
            checkForm: {
                productId: null,
                productName: '',
                systemStock: 0,
                actualStock: 0,
                unit: '',
                reason: ''
            },
            checkHistory: [],
            currentProduct: null
        }
    },

    computed: {
        // 获取所有商品分类
        categories() {
            return [...new Set(this.systemData.products.map(p => p.category))];
        },

        // 根据条件筛选商品
        filteredProducts() {
            return this.systemData.products.filter(product => {
                // 名称筛选
                if (this.queryForm.name && 
                    !product.name.toLowerCase().includes(this.queryForm.name.toLowerCase())) {
                    return false;
                }
                
                // 分类筛选
                if (this.queryForm.category && product.category !== this.queryForm.category) {
                    return false;
                }

                return true;
            }).map(product => ({
                ...product,
                actualStock: product.stock // 用于批量盘点模式
            }));
        }
    },

    methods: {
        // 获取行样式
        getRowClassName({ row }) {
            if (this.batchCheckMode && this.getDifference(row) !== 0) {
                return 'warning-row';
            }
            return '';
        },

        // 获取差异数量
        getDifference(product) {
            return product.actualStock - product.stock;
        },

        // 获取差异样式
        getDiffClass(product) {
            const diff = this.getDifference(product);
            return {
                'red-text': diff < 0,
                'green-text': diff > 0
            };
        },

        // 获取最后盘点日期
        getLastCheckDate(product) {
            if (!product.stockCheckRecords || !product.stockCheckRecords.length) {
                return '从未盘点';
            }
            const lastRecord = product.stockCheckRecords[product.stockCheckRecords.length - 1];
            return lastRecord.date;
        },

        // 开始批量盘点
        startBatchCheck() {
            this.batchCheckMode = true;
            // 初始化实际库存为系统库存
            this.filteredProducts.forEach(product => {
                product.actualStock = product.stock;
            });
        },

        // 取消批量盘点
        cancelBatchCheck() {
            this.batchCheckMode = false;
            // 恢复原始数据
            this.filteredProducts.forEach(product => {
                product.actualStock = product.stock;
            });
        },

        // 确认批量盘点
        confirmBatchCheck() {
            // 检查是否有差异
            const differences = this.filteredProducts.filter(p => this.getDifference(p) !== 0);
            if (!differences.length) {
                this.$message.info('没有发现库存差异');
                this.batchCheckMode = false;
                return;
            }

            // 提示确认
            this.$confirm(
                `发现 ${differences.length} 个商品有库存差异，是否确认盘点结果？`, 
                '确认盘点', 
                {
                    type: 'warning'
                }
            ).then(() => {
                // 批量更新库存
                differences.forEach(product => {
                    const diff = this.getDifference(product);
                    const checkRecord = {
                        id: `SC${Date.now()}_${product.id}`,
                        date: new Date().toISOString().split('T')[0],
                        systemStock: product.stock,
                        actualStock: product.actualStock,
                        difference: diff,
                        reason: `批量盘点${diff > 0 ? '盘盈' : '盘亏'}`
                    };

                    // 更新库存
                    const targetProduct = this.systemData.products.find(p => p.id === product.id);
                    if (targetProduct) {
                        if (!targetProduct.stockCheckRecords) {
                            targetProduct.stockCheckRecords = [];
                        }
                        targetProduct.stockCheckRecords.push(checkRecord);
                        targetProduct.stock = product.actualStock;
                    }
                });

                this.$emit('data-change');
                this.batchCheckMode = false;
                this.$message.success('批量盘点完成');
            }).catch(() => {});
        },

        // 处理单个商品盘点
        handleCheck(product) {
            this.checkForm = {
                productId: product.id,
                productName: product.name,
                systemStock: product.stock,
                actualStock: product.stock,
                unit: product.unit,
                reason: ''
            };
            this.checkDialogVisible = true;
        },

        // 确认单个商品盘点
        confirmCheck() {
            if (this.checkForm.actualStock === this.checkForm.systemStock) {
                this.$message.info('库存无差异，无需盘点');
                this.checkDialogVisible = false;
                return;
            }

            if (!this.checkForm.reason) {
                this.$message.warning('请填写差异原因');
                return;
            }

            const product = this.systemData.products.find(p => p.id === this.checkForm.productId);
            if (product) {
                // 创建盘点记录
                if (!product.stockCheckRecords) {
                    product.stockCheckRecords = [];
                }

                const checkRecord = {
                    id: `SC${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    systemStock: this.checkForm.systemStock,
                    actualStock: this.checkForm.actualStock,
                    difference: this.checkForm.actualStock - this.checkForm.systemStock,
                    reason: this.checkForm.reason
                };

                product.stockCheckRecords.push(checkRecord);
                product.stock = this.checkForm.actualStock;

                this.$emit('data-change');
                this.checkDialogVisible = false;
                this.$message.success('盘点完成');
            }
        },

        // 查看盘点记录
        viewCheckHistory(product) {
            this.currentProduct = product;
            this.checkHistory = product.stockCheckRecords || [];
            this.historyDialogVisible = true;
        },

        // 导出盘点记录
        exportCheckHistory() {
            // 生成CSV内容
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            csvContent += `库存盘点记录 (${new Date().toLocaleDateString()})\n\n`;
            csvContent += `商品编号,商品名称,盘点日期,系统库存,实际库存,差异数量,差异原因\n`;

            this.systemData.products.forEach(product => {
                if (product.stockCheckRecords && product.stockCheckRecords.length) {
                    product.stockCheckRecords.forEach(record => {
                        csvContent += `${product.id},${product.name},${record.date},` +
                            `${record.systemStock},${record.actualStock},${record.difference},` +
                            `"${record.reason || ''}"\n`;
                    });
                }
            });

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `盘点记录_${new Date().toLocaleDateString()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
}); 