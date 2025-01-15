// 库存查询组件
Vue.component('inventory-query-component', {
    template: `
        <div class="inventory-query">
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
                                <el-form-item label="库存状态">
                                    <el-select 
                                        v-model="queryForm.stockStatus" 
                                        placeholder="请选择状态"
                                        clearable>
                                        <el-option label="正常" value="normal"></el-option>
                                        <el-option label="不足" value="warning"></el-option>
                                        <el-option label="紧急" value="danger"></el-option>
                                    </el-select>
                                </el-form-item>
                            </el-form>
                        </el-col>
                        <el-col :span="8" style="text-align: right;">
                            <el-button type="primary" @click="exportInventory">导出库存</el-button>
                        </el-col>
                    </el-row>
                </div>

                <!-- 库存统计卡片 -->
                <el-row :gutter="20" style="margin-bottom: 20px;">
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">商品总数</div>
                            <div class="amount-text">{{ filteredProducts.length }} 个</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">库存总量</div>
                            <div class="amount-text">{{ totalStock }} 件</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">库存总值</div>
                            <div class="amount-text">¥{{ totalValue.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">预警商品</div>
                            <div class="amount-text red-text">{{ warningCount }} 个</div>
                        </el-card>
                    </el-col>
                </el-row>

                <!-- 库存列表 -->
                <el-table :data="filteredProducts" stripe border>
                    <el-table-column prop="id" label="商品编号" width="100"></el-table-column>
                    <el-table-column prop="name" label="商品名称"></el-table-column>
                    <el-table-column prop="category" label="分类" width="120"></el-table-column>
                    <el-table-column prop="spec" label="规格型号" width="120"></el-table-column>
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
                    <el-table-column label="采购价" width="120">
                        <template slot-scope="scope">
                            ¥{{ scope.row.purchasePrice.toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="销售价" width="120">
                        <template slot-scope="scope">
                            ¥{{ scope.row.salePrice.toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="状态" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getStatusType(scope.row.stock)">
                                {{ getStatusText(scope.row.stock) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="150" fixed="right">
                        <template slot-scope="scope">
                            <el-button 
                                size="mini" 
                                @click="viewHistory(scope.row)">库存记录</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 库存记录对话框 -->
            <el-dialog 
                title="库存变动记录" 
                :visible.sync="historyDialogVisible"
                width="80%">
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
                stockStatus: ''
            },
            historyDialogVisible: false,
            stockHistory: []
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

                // 库存状态筛选
                if (this.queryForm.stockStatus) {
                    const status = this.getStatusValue(product.stock);
                    if (status !== this.queryForm.stockStatus) {
                        return false;
                    }
                }

                return true;
            });
        },

        // 库存总量
        totalStock() {
            return this.filteredProducts.reduce((sum, product) => sum + product.stock, 0);
        },

        // 库存总值
        totalValue() {
            return this.filteredProducts.reduce(
                (sum, product) => sum + (product.stock * product.purchasePrice), 0
            );
        },

        // 预警商品数量
        warningCount() {
            return this.filteredProducts.filter(
                product => product.stock <= this.systemConfig.stockWarningLimit
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

        // 获取状态类型
        getStatusType(stock) {
            if (stock <= this.systemConfig.stockDangerLimit) {
                return 'danger';
            }
            if (stock <= this.systemConfig.stockWarningLimit) {
                return 'warning';
            }
            return 'success';
        },

        // 获取状态文本
        getStatusText(stock) {
            if (stock <= this.systemConfig.stockDangerLimit) {
                return '紧急';
            }
            if (stock <= this.systemConfig.stockWarningLimit) {
                return '不足';
            }
            return '正常';
        },

        // 获取状态值（用于筛选）
        getStatusValue(stock) {
            if (stock <= this.systemConfig.stockDangerLimit) {
                return 'danger';
            }
            if (stock <= this.systemConfig.stockWarningLimit) {
                return 'warning';
            }
            return 'normal';
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
            const checkRecords = product.stockCheckRecords || [];
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

        // 导出库存报表
        exportInventory() {
            // 生成CSV内容
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            csvContent += `库存报表 (${new Date().toLocaleDateString()})\n\n`;
            csvContent += `商品编号,商品名称,分类,规格型号,库存数量,单位,库存金额,采购价,销售价,状态\n`;

            this.filteredProducts.forEach(product => {
                const stockValue = product.stock * product.purchasePrice;
                csvContent += `${product.id},${product.name},${product.category},${product.spec},` +
                    `${product.stock},${product.unit},${stockValue.toFixed(2)},` +
                    `${product.purchasePrice.toFixed(2)},${product.salePrice.toFixed(2)},` +
                    `${this.getStatusText(product.stock)}\n`;
            });

            csvContent += `\n汇总信息\n`;
            csvContent += `商品总数,${this.filteredProducts.length}\n`;
            csvContent += `库存总量,${this.totalStock}\n`;
            csvContent += `库存总值,¥${this.totalValue.toFixed(2)}\n`;
            csvContent += `预警商品数量,${this.warningCount}\n`;

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
}); 