// 库存管理模块
Vue.component('inventory-component', {
    template: `
        <div class="inventory-management">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="8">
                            <el-input
                                placeholder="请输入商品名称搜索"
                                v-model="searchQuery"
                                clearable>
                                <i slot="prefix" class="el-icon-search"></i>
                            </el-input>
                        </el-col>
                        <el-col :span="8" style="text-align: right;">
                            <el-button type="primary" @click="exportInventory">导出库存报表</el-button>
                        </el-col>
                    </el-row>
                </div>

                <!-- 库存预警提示 -->
                <el-alert
                    v-if="lowStockProducts.length > 0"
                    :title="'有 ' + lowStockProducts.length + ' 个商品库存不足'"
                    type="warning"
                    show-icon
                    style="margin-bottom: 20px;">
                    <template slot="title">
                        有 {{ lowStockProducts.length }} 个商品库存不足
                        <el-button type="text" @click="showLowStockDetails">查看详情</el-button>
                    </template>
                </el-alert>

                <!-- 库存统计卡片 -->
                <el-row :gutter="20" style="margin-bottom: 20px;">
                    <el-col :span="8">
                        <el-card shadow="hover">
                            <div slot="header">商品总数</div>
                            <div class="amount-text">{{ totalProducts }} 个</div>
                        </el-card>
                    </el-col>
                    <el-col :span="8">
                        <el-card shadow="hover">
                            <div slot="header">库存总量</div>
                            <div class="amount-text">{{ totalStock }} 件</div>
                        </el-card>
                    </el-col>
                    <el-col :span="8">
                        <el-card shadow="hover">
                            <div slot="header">库存金额</div>
                            <div class="amount-text">¥{{ totalValue.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                </el-row>

                <!-- 库存列表 -->
                <el-table :data="filteredProducts" stripe border>
                    <el-table-column prop="id" label="商品编号" width="100"></el-table-column>
                    <el-table-column prop="name" label="商品名称"></el-table-column>
                    <el-table-column prop="category" label="分类"></el-table-column>
                    <el-table-column prop="spec" label="规格型号"></el-table-column>
                    <el-table-column label="库存" width="120">
                        <template slot-scope="scope">
                            <span :class="getStockClass(scope.row.stock)">
                                {{ scope.row.stock }}{{ scope.row.unit }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="库存金额" width="120">
                        <template slot-scope="scope">
                            ¥{{ (scope.row.stock * scope.row.purchasePrice).toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="200" fixed="right">
                        <template slot-scope="scope">
                            <el-button 
                                size="mini" 
                                @click="handleViewHistory(scope.row)">库存记录</el-button>
                            <el-button 
                                size="mini" 
                                type="warning"
                                @click="handleStockCheck(scope.row)">盘点</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

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

            <!-- 库存盘点对话框 -->
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
                    <el-button type="primary" @click="handleConfirmCheck">确 定</el-button>
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
            historyDialogVisible: false,
            checkDialogVisible: false,
            stockHistory: [],
            checkForm: {
                productId: null,
                productName: '',
                systemStock: 0,
                actualStock: 0,
                unit: '',
                reason: ''
            }
        }
    },

    computed: {
        // 过滤后的商品列表
        filteredProducts() {
            return this.systemData.products.filter(product =>
                product.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        },

        // 库存不足的商品
        lowStockProducts() {
            return this.systemData.products.filter(product =>
                product.stock <= this.systemConfig.stockWarningLimit
            );
        },

        // 商品总数
        totalProducts() {
            return this.systemData.products.length;
        },

        // 库存总量
        totalStock() {
            return this.systemData.products.reduce((sum, product) => sum + product.stock, 0);
        },

        // 库存总金额
        totalValue() {
            return this.systemData.products.reduce(
                (sum, product) => sum + (product.stock * product.purchasePrice), 0
            );
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

        // 获取库存记录类型标签样式
        getHistoryType(type) {
            switch (type) {
                case '采购入库':
                    return 'success';
                case '销售出库':
                    return 'danger';
                case '采购退货':
                case '销售退货':
                    return 'warning';
                case '盘点调整':
                    return 'info';
                default:
                    return '';
            }
        },

        // 显示库存不足商品详情
        showLowStockDetails() {
            const detailsHtml = this.lowStockProducts.map(product => 
                `<p>${product.name}：${product.stock}${product.unit} 
                 <span class="${this.getStockClass(product.stock)}">
                    (${product.stock <= this.systemConfig.stockDangerLimit ? '库存紧急' : '库存不足'})
                 </span></p>`
            ).join('');

            this.$alert(
                `<div>
                    <h3>库存预警商品列表</h3>
                    ${detailsHtml}
                </div>`,
                '库存预警',
                {
                    dangerouslyUseHTMLString: true,
                    confirmButtonText: '确定'
                }
            );
        },

        // 查看库存记录
        handleViewHistory(product) {
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

            // 采购退货记录
            this.systemData.purchaseReturns
                .filter(ret => ret.status === '已完成')
                .forEach(ret => {
                    ret.items
                        .filter(item => item.productId === product.id)
                        .forEach(item => {
                            balance -= item.quantity;
                            history.push({
                                date: ret.returnDate,
                                type: '采购退货',
                                documentNo: ret.returnNo,
                                quantity: -item.quantity,
                                balance: balance,
                                remark: ret.reason || ''
                            });
                        });
                });

            // 销售出库记录
            this.systemData.sales
                .filter(order => order.status === '已完成')
                .forEach(order => {
                    order.items
                        .filter(item => item.productId === product.id)
                        .forEach(item => {
                            balance -= item.quantity;
                            history.push({
                                date: order.orderDate,
                                type: '销售出库',
                                documentNo: order.orderNo,
                                quantity: -item.quantity,
                                balance: balance,
                                remark: order.remark || ''
                            });
                        });
                });

            // 销售退货记录
            this.systemData.salesReturns
                .filter(ret => ret.status === '已完成')
                .forEach(ret => {
                    ret.items
                        .filter(item => item.productId === product.id)
                        .forEach(item => {
                            balance += item.quantity;
                            history.push({
                                date: ret.returnDate,
                                type: '销售退货',
                                documentNo: ret.returnNo,
                                quantity: item.quantity,
                                balance: balance,
                                remark: ret.reason || ''
                            });
                        });
                });

            // 盘点记录
            const checkRecords = this.systemData.products
                .find(p => p.id === product.id)?.stockCheckRecords || [];
            
            checkRecords.forEach(record => {
                const diff = record.actualStock - record.systemStock;
                if (diff !== 0) {
                    balance = record.actualStock;
                    history.push({
                        date: record.date,
                        type: '盘点调整',
                        documentNo: record.id,
                        quantity: diff,
                        balance: balance,
                        remark: record.reason || ''
                    });
                }
            });

            // 按日期排序
            this.stockHistory = history.sort((a, b) => new Date(a.date) - new Date(b.date));
            this.historyDialogVisible = true;
        },

        // 处理库存盘点
        handleStockCheck(product) {
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

        // 确认盘点
        handleConfirmCheck() {
            if (!this.checkForm.reason && this.checkForm.actualStock !== this.checkForm.systemStock) {
                this.$message.warning('库存有差异时必须填写原因');
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

        // 导出库存报表
        exportInventory() {
            // 生成CSV内容
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            csvContent += `库存报表 (${new Date().toLocaleDateString()})\n\n`;
            csvContent += `商品编号,商品名称,分类,规格型号,库存数量,单位,库存金额,状态\n`;

            this.systemData.products.forEach(product => {
                const stockValue = product.stock * product.purchasePrice;
                let status = '正常';
                if (product.stock <= this.systemConfig.stockDangerLimit) {
                    status = '库存紧急';
                } else if (product.stock <= this.systemConfig.stockWarningLimit) {
                    status = '库存不足';
                }

                csvContent += `${product.id},${product.name},${product.category},${product.spec},${product.stock},${product.unit},${stockValue.toFixed(2)},${status}\n`;
            });

            csvContent += `\n汇总信息\n`;
            csvContent += `商品总数,${this.totalProducts}\n`;
            csvContent += `库存总量,${this.totalStock}\n`;
            csvContent += `库存总金额,¥${this.totalValue.toFixed(2)}\n`;
            csvContent += `库存预警数量,${this.lowStockProducts.length}\n`;

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `库存报表_${new Date().toLocaleDateString()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
}) 