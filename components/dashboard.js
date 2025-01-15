// 仪表盘组件
Vue.component('dashboard-component', {
    template: `
        <div class="dashboard">
            <!-- 业务概览 -->
            <el-row :gutter="20">
                <el-col :span="6">
                    <el-card shadow="hover">
                        <div slot="header">今日销售额</div>
                        <div class="amount-text">¥{{ todaySales.toFixed(2) }}</div>
                        <div class="trend-text" :class="{'green-text': salesTrend >= 0, 'red-text': salesTrend < 0}">
                            较昨日{{ salesTrend >= 0 ? '增长' : '下降' }} {{ Math.abs(salesTrend).toFixed(2) }}%
                        </div>
                    </el-card>
                </el-col>
                <el-col :span="6">
                    <el-card shadow="hover">
                        <div slot="header">本月销售额</div>
                        <div class="amount-text">¥{{ monthlySales.toFixed(2) }}</div>
                        <div>完成月度目标的 {{ (monthlyTarget * 100).toFixed(1) }}%</div>
                    </el-card>
                </el-col>
                <el-col :span="6">
                    <el-card shadow="hover">
                        <div slot="header">库存总值</div>
                        <div class="amount-text">¥{{ inventoryValue.toFixed(2) }}</div>
                        <div>{{ lowStockCount }} 个商品库存不足</div>
                    </el-card>
                </el-col>
                <el-col :span="6">
                    <el-card shadow="hover">
                        <div slot="header">现金余额</div>
                        <div class="amount-text">¥{{ systemData.cashFlow.balance.toFixed(2) }}</div>
                        <div>应收：¥{{ systemData.receivables.total.toFixed(2) }}</div>
                    </el-card>
                </el-col>
            </el-row>

            <!-- 待办事项 -->
            <el-card style="margin-top: 20px;">
                <div slot="header">
                    <span>待办事项</span>
                </div>
                <el-row :gutter="20">
                    <el-col :span="8">
                        <h4>库存预警 ({{ lowStockProducts.length }})</h4>
                        <el-table :data="lowStockProducts.slice(0, 5)" size="mini">
                            <el-table-column prop="name" label="商品名称"></el-table-column>
                            <el-table-column label="库存" width="100">
                                <template slot-scope="scope">
                                    <span :class="getStockClass(scope.row.stock)">
                                        {{ scope.row.stock }}{{ scope.row.unit }}
                                    </span>
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-col>
                    <el-col :span="8">
                        <h4>待收款 ({{ unpaidReceivables.length }})</h4>
                        <el-table :data="unpaidReceivables.slice(0, 5)" size="mini">
                            <el-table-column prop="customerName" label="客户"></el-table-column>
                            <el-table-column label="金额" width="120">
                                <template slot-scope="scope">
                                    ¥{{ (scope.row.amount - scope.row.paidAmount).toFixed(2) }}
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-col>
                    <el-col :span="8">
                        <h4>待付款 ({{ unpaidPayables.length }})</h4>
                        <el-table :data="unpaidPayables.slice(0, 5)" size="mini">
                            <el-table-column prop="supplierName" label="供应商"></el-table-column>
                            <el-table-column label="金额" width="120">
                                <template slot-scope="scope">
                                    ¥{{ (scope.row.amount - scope.row.paidAmount).toFixed(2) }}
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-col>
                </el-row>
            </el-card>

            <!-- 销售趋势图 -->
            <el-card style="margin-top: 20px;">
                <div slot="header">
                    <span>销售趋势</span>
                    <el-radio-group 
                        v-model="chartPeriod" 
                        size="small" 
                        style="margin-left: 20px;"
                        @change="updateChart">
                        <el-radio-button label="week">本周</el-radio-button>
                        <el-radio-button label="month">本月</el-radio-button>
                    </el-radio-group>
                </div>
                <div ref="chart" style="width: 100%; height: 300px;"></div>
            </el-card>

            <!-- 最近交易记录 -->
            <el-card style="margin-top: 20px;">
                <div slot="header">最近交易记录</div>
                <el-table :data="recentTransactions" stripe>
                    <el-table-column prop="date" label="日期" width="120"></el-table-column>
                    <el-table-column prop="type" label="类型" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getTransactionType(scope.row.type)">
                                {{ scope.row.type }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="documentNo" label="单据编号" width="160"></el-table-column>
                    <el-table-column label="金额" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': scope.row.type === '支出', 'green-text': scope.row.type === '收入'}">
                                ¥{{ scope.row.amount.toFixed(2) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="relatedType" label="相关业务" width="120"></el-table-column>
                    <el-table-column prop="remark" label="备注"></el-table-column>
                </el-table>
            </el-card>
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
            chartPeriod: 'week',
            chart: null
        }
    },

    computed: {
        // 今日销售额
        todaySales() {
            const today = moment().format('YYYY-MM-DD');
            return this.systemData.sales
                .filter(sale => sale.orderDate === today && sale.status === '已完成')
                .reduce((sum, sale) => sum + sale.totalAmount, 0);
        },

        // 销售趋势（与昨日相比）
        salesTrend() {
            const today = moment().format('YYYY-MM-DD');
            const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
            
            const todaySales = this.systemData.sales
                .filter(sale => sale.orderDate === today && sale.status === '已完成')
                .reduce((sum, sale) => sum + sale.totalAmount, 0);
            
            const yesterdaySales = this.systemData.sales
                .filter(sale => sale.orderDate === yesterday && sale.status === '已完成')
                .reduce((sum, sale) => sum + sale.totalAmount, 0);

            return yesterdaySales ? ((todaySales - yesterdaySales) / yesterdaySales * 100) : 0;
        },

        // 本月销售额
        monthlySales() {
            const currentMonth = moment().format('YYYY-MM');
            return this.systemData.sales
                .filter(sale => 
                    moment(sale.orderDate).format('YYYY-MM') === currentMonth && 
                    sale.status === '已完成'
                )
                .reduce((sum, sale) => sum + sale.totalAmount, 0);
        },

        // 月度目标完成率（假设月度目标为100000）
        monthlyTarget() {
            const target = 100000;
            return this.monthlySales / target;
        },

        // 库存总值
        inventoryValue() {
            return this.systemData.products.reduce(
                (sum, product) => sum + (product.stock * product.purchasePrice), 0
            );
        },

        // 库存不足的商品数量
        lowStockCount() {
            return this.lowStockProducts.length;
        },

        // 库存不足的商品
        lowStockProducts() {
            return this.systemData.products
                .filter(product => product.stock <= this.systemConfig.stockWarningLimit)
                .sort((a, b) => a.stock - b.stock);
        },

        // 未收款记录
        unpaidReceivables() {
            return this.systemData.receivables.records
                .filter(record => record.status !== '已收款')
                .map(record => {
                    const customer = this.systemData.customers.find(c => c.id === record.customerId);
                    return {
                        ...record,
                        customerName: customer ? customer.name : '未知客户'
                    };
                })
                .sort((a, b) => (b.amount - b.paidAmount) - (a.amount - a.paidAmount));
        },

        // 未付款记录
        unpaidPayables() {
            return this.systemData.payables.records
                .filter(record => record.status !== '已付款')
                .map(record => {
                    const supplier = this.systemData.suppliers.find(s => s.id === record.supplierId);
                    return {
                        ...record,
                        supplierName: supplier ? supplier.name : '未知供应商'
                    };
                })
                .sort((a, b) => (b.amount - b.paidAmount) - (a.amount - a.paidAmount));
        },

        // 最近交易记录
        recentTransactions() {
            return this.systemData.cashFlow.records
                .sort((a, b) => moment(b.date) - moment(a.date))
                .slice(0, 10);
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

        // 获取交易类型标签样式
        getTransactionType(type) {
            return type === '收入' ? 'success' : 'danger';
        },

        // 初始化图表
        initChart() {
            if (this.chart) {
                this.chart.dispose();
            }
            this.chart = echarts.init(this.$refs.chart);
            this.updateChart();
        },

        // 更新图表数据
        updateChart() {
            if (!this.chart) {
                this.initChart();
                return;
            }

            const days = this.chartPeriod === 'week' ? 7 : 30;
            const data = {};

            // 初始化日期数据
            for (let i = days - 1; i >= 0; i--) {
                const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
                data[date] = { sales: 0, returns: 0 };
            }

            // 统计销售数据
            this.systemData.sales
                .filter(sale => sale.status === '已完成')
                .forEach(sale => {
                    if (data[sale.orderDate]) {
                        data[sale.orderDate].sales += sale.totalAmount;
                    }
                });

            // 统计退货数据
            this.systemData.salesReturns
                .filter(ret => ret.status === '已完成')
                .forEach(ret => {
                    if (data[ret.returnDate]) {
                        data[ret.returnDate].returns += ret.totalAmount;
                    }
                });

            // 准备图表数据
            const dates = Object.keys(data).sort();
            const salesData = dates.map(date => data[date].sales.toFixed(2));
            const returnsData = dates.map(date => data[date].returns.toFixed(2));
            const netData = dates.map(date => 
                (data[date].sales - data[date].returns).toFixed(2)
            );

            // 设置图表选项
            const option = {
                title: {
                    text: this.chartPeriod === 'week' ? '本周销售趋势' : '本月销售趋势'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: (params) => {
                        let result = params[0].name + '<br/>';
                        params.forEach(param => {
                            const marker = param.marker;
                            const value = parseFloat(param.value).toFixed(2);
                            result += marker + param.seriesName + ': ¥' + value + '<br/>';
                        });
                        return result;
                    }
                },
                legend: {
                    data: ['销售额', '退货额', '净销售额']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: dates
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: '¥{value}'
                    }
                },
                series: [
                    {
                        name: '销售额',
                        type: 'line',
                        data: salesData,
                        itemStyle: { color: '#67C23A' }
                    },
                    {
                        name: '退货额',
                        type: 'line',
                        data: returnsData,
                        itemStyle: { color: '#F56C6C' }
                    },
                    {
                        name: '净销售额',
                        type: 'line',
                        data: netData,
                        itemStyle: { color: '#409EFF' }
                    }
                ]
            };

            this.chart.setOption(option);
        }
    },

    // 添加生命周期钩子
    mounted() {
        this.initChart();
        window.addEventListener('resize', this.chart?.resize);
    },

    beforeDestroy() {
        window.removeEventListener('resize', this.chart?.resize);
        this.chart?.dispose();
    }
}); 