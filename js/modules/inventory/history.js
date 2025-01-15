// 库存变动记录组件
Vue.component('inventory-history-component', {
    template: `
        <div class="inventory-history">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="16">
                            <el-form :inline="true" :model="queryForm">
                                <el-form-item label="商品">
                                    <el-select 
                                        v-model="queryForm.productId" 
                                        placeholder="请选择商品"
                                        filterable
                                        clearable>
                                        <el-option
                                            v-for="product in systemData.products"
                                            :key="product.id"
                                            :label="product.name"
                                            :value="product.id">
                                        </el-option>
                                    </el-select>
                                </el-form-item>
                                <el-form-item label="日期范围">
                                    <el-date-picker
                                        v-model="queryForm.dateRange"
                                        type="daterange"
                                        range-separator="至"
                                        start-placeholder="开始日期"
                                        end-placeholder="结束日期"
                                        @change="handleDateRangeChange">
                                    </el-date-picker>
                                </el-form-item>
                                <el-form-item label="变动类型">
                                    <el-select 
                                        v-model="queryForm.type" 
                                        placeholder="请选择类型"
                                        clearable>
                                        <el-option label="采购入库" value="采购入库"></el-option>
                                        <el-option label="销售出库" value="销售出库"></el-option>
                                        <el-option label="采购退货" value="采购退货"></el-option>
                                        <el-option label="销售退货" value="销售退货"></el-option>
                                        <el-option label="盘点调整" value="盘点调整"></el-option>
                                    </el-select>
                                </el-form-item>
                            </el-form>
                        </el-col>
                        <el-col :span="8" style="text-align: right;">
                            <el-button type="primary" @click="exportHistory">导出记录</el-button>
                        </el-col>
                    </el-row>
                </div>

                <!-- 变动统计卡片 -->
                <el-row :gutter="20" style="margin-bottom: 20px;">
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">入库总量</div>
                            <div class="amount-text green-text">{{ inboundTotal }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">出库总量</div>
                            <div class="amount-text red-text">{{ outboundTotal }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">净变动</div>
                            <div class="amount-text" :class="{'red-text': netChange < 0, 'green-text': netChange > 0}">
                                {{ netChange }}
                            </div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">变动次数</div>
                            <div class="amount-text">{{ filteredRecords.length }} 次</div>
                        </el-card>
                    </el-col>
                </el-row>

                <!-- 变动记录列表 -->
                <el-table :data="filteredRecords" stripe border>
                    <el-table-column prop="date" label="日期" width="120"></el-table-column>
                    <el-table-column prop="productName" label="商品名称"></el-table-column>
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
                                {{ scope.row.quantity > 0 ? '+' : '' }}{{ scope.row.quantity }}{{ scope.row.unit }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="库存余额" width="120">
                        <template slot-scope="scope">
                            {{ scope.row.balance }}{{ scope.row.unit }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="remark" label="备注"></el-table-column>
                    <el-table-column label="操作" width="120" fixed="right">
                        <template slot-scope="scope">
                            <el-button 
                                size="mini" 
                                @click="viewDetail(scope.row)">详情</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 详情对话框 -->
            <el-dialog 
                title="变动详情" 
                :visible.sync="detailDialogVisible"
                width="50%">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="日期">{{ currentDetail.date }}</el-descriptions-item>
                    <el-descriptions-item label="类型">
                        <el-tag :type="getHistoryType(currentDetail.type)">
                            {{ currentDetail.type }}
                        </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="商品名称">{{ currentDetail.productName }}</el-descriptions-item>
                    <el-descriptions-item label="单据编号">{{ currentDetail.documentNo }}</el-descriptions-item>
                    <el-descriptions-item label="变动数量">
                        <span :class="{'red-text': currentDetail.quantity < 0, 'green-text': currentDetail.quantity > 0}">
                            {{ currentDetail.quantity > 0 ? '+' : '' }}{{ currentDetail.quantity }}{{ currentDetail.unit }}
                        </span>
                    </el-descriptions-item>
                    <el-descriptions-item label="库存余额">
                        {{ currentDetail.balance }}{{ currentDetail.unit }}
                    </el-descriptions-item>
                    <el-descriptions-item label="备注" :span="2">{{ currentDetail.remark || '无' }}</el-descriptions-item>
                </el-descriptions>
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
                productId: null,
                dateRange: [],
                type: ''
            },
            detailDialogVisible: false,
            currentDetail: {}
        }
    },

    computed: {
        // 获取所有库存变动记录
        allRecords() {
            const records = [];

            // 遍历所有商品
            this.systemData.products.forEach(product => {
                let balance = 0;

                // 采购入库记录
                this.systemData.purchases
                    .filter(order => order.status === '已完成')
                    .forEach(order => {
                        order.items
                            .filter(item => item.productId === product.id)
                            .forEach(item => {
                                balance += item.quantity;
                                records.push({
                                    date: order.orderDate,
                                    productId: product.id,
                                    productName: product.name,
                                    unit: product.unit,
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
                                records.push({
                                    date: ret.returnDate,
                                    productId: product.id,
                                    productName: product.name,
                                    unit: product.unit,
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
                                records.push({
                                    date: order.orderDate,
                                    productId: product.id,
                                    productName: product.name,
                                    unit: product.unit,
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
                                records.push({
                                    date: ret.returnDate,
                                    productId: product.id,
                                    productName: product.name,
                                    unit: product.unit,
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
                        records.push({
                            date: record.date,
                            productId: product.id,
                            productName: product.name,
                            unit: product.unit,
                            type: '盘点调整',
                            documentNo: record.id,
                            quantity: diff,
                            balance: balance,
                            remark: record.reason || ''
                        });
                    }
                });
            });

            // 按日期排序
            return records.sort((a, b) => new Date(b.date) - new Date(a.date));
        },

        // 根据条件筛选记录
        filteredRecords() {
            return this.allRecords.filter(record => {
                // 商品筛选
                if (this.queryForm.productId && record.productId !== this.queryForm.productId) {
                    return false;
                }

                // 日期范围筛选
                if (this.queryForm.dateRange && this.queryForm.dateRange.length) {
                    const recordDate = new Date(record.date);
                    if (recordDate < this.queryForm.dateRange[0] || 
                        recordDate > this.queryForm.dateRange[1]) {
                        return false;
                    }
                }

                // 类型筛选
                if (this.queryForm.type && record.type !== this.queryForm.type) {
                    return false;
                }

                return true;
            });
        },

        // 入库总量
        inboundTotal() {
            return this.filteredRecords
                .filter(r => r.quantity > 0)
                .reduce((sum, r) => sum + r.quantity, 0);
        },

        // 出库总量
        outboundTotal() {
            return Math.abs(this.filteredRecords
                .filter(r => r.quantity < 0)
                .reduce((sum, r) => sum + r.quantity, 0));
        },

        // 净变动
        netChange() {
            return this.inboundTotal - this.outboundTotal;
        }
    },

    methods: {
        // 处理日期范围变化
        handleDateRangeChange() {
            // 日期范围变化时可能需要重新计算统计数据
        },

        // 获取记录类型标签样式
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

        // 查看详情
        viewDetail(record) {
            this.currentDetail = { ...record };
            this.detailDialogVisible = true;
        },

        // 导出变动记录
        exportHistory() {
            // 生成CSV内容
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            csvContent += `库存变动记录\n`;
            if (this.queryForm.dateRange && this.queryForm.dateRange.length) {
                csvContent += `统计期间：${this.queryForm.dateRange[0].toLocaleDateString()} 至 ${this.queryForm.dateRange[1].toLocaleDateString()}\n`;
            }
            if (this.queryForm.productId) {
                const product = this.systemData.products.find(p => p.id === this.queryForm.productId);
                csvContent += `商品名称：${product.name}\n`;
            }
            csvContent += '\n';
            csvContent += `日期,商品名称,变动类型,单据编号,变动数量,库存余额,备注\n`;

            this.filteredRecords.forEach(record => {
                csvContent += `${record.date},${record.productName},${record.type},` +
                    `${record.documentNo},${record.quantity},${record.balance},"${record.remark || ''}"\n`;
            });

            csvContent += `\n汇总信息\n`;
            csvContent += `入库总量,${this.inboundTotal}\n`;
            csvContent += `出库总量,${this.outboundTotal}\n`;
            csvContent += `净变动,${this.netChange}\n`;
            csvContent += `变动次数,${this.filteredRecords.length}\n`;

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `库存变动记录_${new Date().toLocaleDateString()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
}); 