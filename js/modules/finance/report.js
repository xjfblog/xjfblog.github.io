// 财务报表组件
Vue.component('finance-report-component', {
    template: `
        <div class="finance-report">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="16">
                            <el-form :inline="true" :model="queryForm">
                                <el-form-item label="报表类型">
                                    <el-select v-model="queryForm.type">
                                        <el-option label="资产负债表" value="balance"></el-option>
                                        <el-option label="利润表" value="profit"></el-option>
                                        <el-option label="现金流量表" value="cashflow"></el-option>
                                    </el-select>
                                </el-form-item>
                                <el-form-item label="统计期间">
                                    <el-date-picker
                                        v-model="queryForm.date"
                                        type="month"
                                        placeholder="选择月份"
                                        @change="generateReport">
                                    </el-date-picker>
                                </el-form-item>
                            </el-form>
                        </el-col>
                        <el-col :span="8" style="text-align: right;">
                            <el-button type="primary" @click="generateReport">生成报表</el-button>
                            <el-button type="success" @click="exportReport">导出报表</el-button>
                        </el-col>
                    </el-row>
                </div>

                <!-- 资产负债表 -->
                <div v-if="queryForm.type === 'balance'" class="report-content">
                    <h3>资产负债表</h3>
                    <p>截止日期：{{ formatDate(queryForm.date) }}</p>
                    
                    <el-row :gutter="20">
                        <!-- 资产部分 -->
                        <el-col :span="12">
                            <el-card shadow="never">
                                <div slot="header">资产</div>
                                <el-descriptions :column="1" border>
                                    <el-descriptions-item label="流动资产">
                                        <el-descriptions :column="1" size="small">
                                            <el-descriptions-item label="现金">
                                                ¥{{ (balanceSheet.cash || 0).toFixed(2) }}
                                            </el-descriptions-item>
                                            <el-descriptions-item label="应收账款">
                                                ¥{{ (balanceSheet.receivables || 0).toFixed(2) }}
                                            </el-descriptions-item>
                                            <el-descriptions-item label="存货">
                                                ¥{{ (balanceSheet.inventory || 0).toFixed(2) }}
                                            </el-descriptions-item>
                                        </el-descriptions>
                                    </el-descriptions-item>
                                    <el-descriptions-item label="资产总计">
                                        <span class="amount-text">
                                            ¥{{ (balanceSheet.totalAssets || 0).toFixed(2) }}
                                        </span>
                                    </el-descriptions-item>
                                </el-descriptions>
                            </el-card>
                        </el-col>
                        
                        <!-- 负债和所有者权益部分 -->
                        <el-col :span="12">
                            <el-card shadow="never">
                                <div slot="header">负债和所有者权益</div>
                                <el-descriptions :column="1" border>
                                    <el-descriptions-item label="流动负债">
                                        <el-descriptions :column="1" size="small">
                                            <el-descriptions-item label="应付账款">
                                                ¥{{ (balanceSheet.payables || 0).toFixed(2) }}
                                            </el-descriptions-item>
                                        </el-descriptions>
                                    </el-descriptions-item>
                                    <el-descriptions-item label="所有者权益">
                                        <el-descriptions :column="1" size="small">
                                            <el-descriptions-item label="实收资本">
                                                ¥{{ (balanceSheet.capital || 0).toFixed(2) }}
                                            </el-descriptions-item>
                                            <el-descriptions-item label="未分配利润">
                                                ¥{{ (balanceSheet.retainedEarnings || 0).toFixed(2) }}
                                            </el-descriptions-item>
                                        </el-descriptions>
                                    </el-descriptions-item>
                                    <el-descriptions-item label="负债和所有者权益总计">
                                        <span class="amount-text">
                                            ¥{{ (balanceSheet.totalEquity || 0).toFixed(2) }}
                                        </span>
                                    </el-descriptions-item>
                                </el-descriptions>
                            </el-card>
                        </el-col>
                    </el-row>
                </div>

                <!-- 利润表 -->
                <div v-if="queryForm.type === 'profit'" class="report-content">
                    <h3>利润表</h3>
                    <p>{{ formatDate(queryForm.date) }}</p>

                    <el-card shadow="never">
                        <el-descriptions :column="1" border>
                            <el-descriptions-item label="营业收入">
                                <span class="green-text">¥{{ (profitSheet.revenue || 0).toFixed(2) }}</span>
                            </el-descriptions-item>
                            <el-descriptions-item label="营业成本">
                                <span class="red-text">¥{{ (profitSheet.cost || 0).toFixed(2) }}</span>
                            </el-descriptions-item>
                            <el-descriptions-item label="毛利">
                                <span :class="profitSheet.grossProfit >= 0 ? 'green-text' : 'red-text'">
                                    ¥{{ (profitSheet.grossProfit || 0).toFixed(2) }}
                                </span>
                            </el-descriptions-item>
                            <el-descriptions-item label="营业利润">
                                <span :class="profitSheet.operatingProfit >= 0 ? 'green-text' : 'red-text'">
                                    ¥{{ (profitSheet.operatingProfit || 0).toFixed(2) }}
                                </span>
                            </el-descriptions-item>
                            <el-descriptions-item label="净利润">
                                <span class="amount-text" :class="profitSheet.netProfit >= 0 ? 'green-text' : 'red-text'">
                                    ¥{{ (profitSheet.netProfit || 0).toFixed(2) }}
                                </span>
                            </el-descriptions-item>
                        </el-descriptions>
                    </el-card>
                </div>

                <!-- 现金流量表 -->
                <div v-if="queryForm.type === 'cashflow'" class="report-content">
                    <h3>现金流量表</h3>
                    <p>{{ formatDate(queryForm.date) }}</p>

                    <el-card shadow="never">
                        <el-descriptions :column="1" border>
                            <el-descriptions-item label="经营活动现金流量">
                                <el-descriptions :column="1" size="small">
                                    <el-descriptions-item label="销售商品、提供劳务收到的现金">
                                        <span class="green-text">
                                            ¥{{ (cashFlowSheet.salesCash || 0).toFixed(2) }}
                                        </span>
                                    </el-descriptions-item>
                                    <el-descriptions-item label="购买商品、接受劳务支付的现金">
                                        <span class="red-text">
                                            ¥{{ (cashFlowSheet.purchaseCash || 0).toFixed(2) }}
                                        </span>
                                    </el-descriptions-item>
                                    <el-descriptions-item label="经营活动产生的现金流量净额">
                                        <span :class="cashFlowSheet.operatingCashFlow >= 0 ? 'green-text' : 'red-text'">
                                            ¥{{ (cashFlowSheet.operatingCashFlow || 0).toFixed(2) }}
                                        </span>
                                    </el-descriptions-item>
                                </el-descriptions>
                            </el-descriptions-item>
                            <el-descriptions-item label="期末现金余额">
                                <span class="amount-text">
                                    ¥{{ (cashFlowSheet.endingCash || 0).toFixed(2) }}
                                </span>
                            </el-descriptions-item>
                        </el-descriptions>
                    </el-card>
                </div>
            </el-card>
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
                type: 'balance',
                date: new Date()
            },
            balanceSheet: {},
            profitSheet: {},
            cashFlowSheet: {}
        }
    },

    methods: {
        // 格式化日期
        formatDate(date) {
            if (!date) return '';
            const d = new Date(date);
            return `${d.getFullYear()}年${d.getMonth() + 1}月`;
        },

        // 生成报表
        generateReport() {
            switch (this.queryForm.type) {
                case 'balance':
                    this.generateBalanceSheet();
                    break;
                case 'profit':
                    this.generateProfitSheet();
                    break;
                case 'cashflow':
                    this.generateCashFlowSheet();
                    break;
            }
        },

        // 生成资产负债表
        generateBalanceSheet() {
            // 现金
            const cash = this.systemData.cashFlow?.balance || 0;

            // 应收账款
            const receivables = this.systemData.receivables?.records.reduce(
                (sum, r) => sum + (r.amount - r.receivedAmount), 0
            ) || 0;

            // 存货
            const inventory = this.systemData.products.reduce(
                (sum, p) => sum + p.stock * p.purchasePrice, 0
            );

            // 应付账款
            const payables = this.systemData.payables?.records.reduce(
                (sum, p) => sum + (p.amount - p.paidAmount), 0
            ) || 0;

            // 计算总资产和所有者权益
            const totalAssets = cash + receivables + inventory;
            const retainedEarnings = totalAssets - payables - 1000000; // 假设实收资本为100万

            this.balanceSheet = {
                cash,
                receivables,
                inventory,
                totalAssets,
                payables,
                capital: 1000000,
                retainedEarnings,
                totalEquity: totalAssets
            };
        },

        // 生成利润表
        generateProfitSheet() {
            const date = this.queryForm.date;
            const year = date.getFullYear();
            const month = date.getMonth();
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);

            // 获取指定月份的销售记录
            const sales = this.systemData.sales.filter(sale => {
                const saleDate = new Date(sale.orderDate);
                return saleDate >= startDate && saleDate <= endDate;
            });

            // 计算收入和成本
            const revenue = sales.reduce((sum, sale) => {
                return sum + sale.items.reduce((s, item) => s + item.amount, 0);
            }, 0);

            const cost = sales.reduce((sum, sale) => {
                return sum + sale.items.reduce((s, item) => {
                    const product = this.systemData.products.find(p => p.id === item.productId);
                    return s + (product ? item.quantity * product.purchasePrice : 0);
                }, 0);
            }, 0);

            // 计算利润
            const grossProfit = revenue - cost;
            const operatingProfit = grossProfit;
            const netProfit = operatingProfit;

            this.profitSheet = {
                revenue,
                cost,
                grossProfit,
                operatingProfit,
                netProfit
            };
        },

        // 生成现金流量表
        generateCashFlowSheet() {
            const date = this.queryForm.date;
            const year = date.getFullYear();
            const month = date.getMonth();
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);

            // 获取指定月份的现金流记录
            const cashFlows = this.systemData.cashFlow?.records.filter(flow => {
                const flowDate = new Date(flow.date);
                return flowDate >= startDate && flowDate <= endDate;
            }) || [];

            // 销售收到的现金
            const salesCash = cashFlows
                .filter(flow => flow.type === '收入' && flow.relatedType === '销售收款')
                .reduce((sum, flow) => sum + flow.amount, 0);

            // 采购支付的现金
            const purchaseCash = cashFlows
                .filter(flow => flow.type === '支出' && flow.relatedType === '采购付款')
                .reduce((sum, flow) => sum + flow.amount, 0);

            // 经营活动现金流量
            const operatingCashFlow = salesCash - purchaseCash;

            this.cashFlowSheet = {
                salesCash,
                purchaseCash,
                operatingCashFlow,
                endingCash: this.systemData.cashFlow?.balance || 0
            };
        },

        // 导出报表
        exportReport() {
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            const reportDate = this.formatDate(this.queryForm.date);

            switch (this.queryForm.type) {
                case 'balance':
                    csvContent += `资产负债表\n`;
                    csvContent += `截止日期：${reportDate}\n\n`;
                    csvContent += `资产\n`;
                    csvContent += `流动资产：\n`;
                    csvContent += `现金,¥${this.balanceSheet.cash.toFixed(2)}\n`;
                    csvContent += `应收账款,¥${this.balanceSheet.receivables.toFixed(2)}\n`;
                    csvContent += `存货,¥${this.balanceSheet.inventory.toFixed(2)}\n`;
                    csvContent += `资产总计,¥${this.balanceSheet.totalAssets.toFixed(2)}\n\n`;
                    csvContent += `负债和所有者权益\n`;
                    csvContent += `流动负债：\n`;
                    csvContent += `应付账款,¥${this.balanceSheet.payables.toFixed(2)}\n`;
                    csvContent += `所有者权益：\n`;
                    csvContent += `实收资本,¥${this.balanceSheet.capital.toFixed(2)}\n`;
                    csvContent += `未分配利润,¥${this.balanceSheet.retainedEarnings.toFixed(2)}\n`;
                    csvContent += `负债和所有者权益总计,¥${this.balanceSheet.totalEquity.toFixed(2)}\n`;
                    break;

                case 'profit':
                    csvContent += `利润表\n`;
                    csvContent += `${reportDate}\n\n`;
                    csvContent += `营业收入,¥${this.profitSheet.revenue.toFixed(2)}\n`;
                    csvContent += `营业成本,¥${this.profitSheet.cost.toFixed(2)}\n`;
                    csvContent += `毛利,¥${this.profitSheet.grossProfit.toFixed(2)}\n`;
                    csvContent += `营业利润,¥${this.profitSheet.operatingProfit.toFixed(2)}\n`;
                    csvContent += `净利润,¥${this.profitSheet.netProfit.toFixed(2)}\n`;
                    break;

                case 'cashflow':
                    csvContent += `现金流量表\n`;
                    csvContent += `${reportDate}\n\n`;
                    csvContent += `经营活动现金流量：\n`;
                    csvContent += `销售商品、提供劳务收到的现金,¥${this.cashFlowSheet.salesCash.toFixed(2)}\n`;
                    csvContent += `购买商品、接受劳务支付的现金,¥${this.cashFlowSheet.purchaseCash.toFixed(2)}\n`;
                    csvContent += `经营活动产生的现金流量净额,¥${this.cashFlowSheet.operatingCashFlow.toFixed(2)}\n\n`;
                    csvContent += `期末现金余额,¥${this.cashFlowSheet.endingCash.toFixed(2)}\n`;
                    break;
            }

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${this.queryForm.type === 'balance' ? '资产负债表' : 
                this.queryForm.type === 'profit' ? '利润表' : '现金流量表'}_${reportDate}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    },

    mounted() {
        this.generateReport();
    }
}); 