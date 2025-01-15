// 应收管理组件
Vue.component('receivables-component', {
    template: `
        <div class="receivables">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="16">
                            <el-form :inline="true" :model="queryForm">
                                <el-form-item label="客户">
                                    <el-select 
                                        v-model="queryForm.customerId" 
                                        placeholder="请选择客户"
                                        filterable
                                        clearable>
                                        <el-option
                                            v-for="customer in systemData.customers"
                                            :key="customer.id"
                                            :label="customer.name"
                                            :value="customer.id">
                                        </el-option>
                                    </el-select>
                                </el-form-item>
                                <el-form-item label="状态">
                                    <el-select 
                                        v-model="queryForm.status" 
                                        placeholder="请选择状态"
                                        clearable>
                                        <el-option label="未收款" value="pending"></el-option>
                                        <el-option label="部分收款" value="partial"></el-option>
                                        <el-option label="已收款" value="completed"></el-option>
                                        <el-option label="已逾期" value="overdue"></el-option>
                                    </el-select>
                                </el-form-item>
                            </el-form>
                        </el-col>
                        <el-col :span="8" style="text-align: right;">
                            <el-button type="primary" @click="handleReceive">收款登记</el-button>
                            <el-button type="success" @click="exportReceivables">导出明细</el-button>
                        </el-col>
                    </el-row>
                </div>

                <!-- 应收统计卡片 -->
                <el-row :gutter="20" style="margin-bottom: 20px;">
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">应收总额</div>
                            <div class="amount-text">¥{{ (totalAmount || 0).toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">已收金额</div>
                            <div class="amount-text green-text">¥{{ (receivedAmount || 0).toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">未收金额</div>
                            <div class="amount-text red-text">¥{{ (unreceiveAmount || 0).toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">逾期金额</div>
                            <div class="amount-text warning-text">¥{{ (overdueAmount || 0).toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                </el-row>

                <!-- 应收列表 -->
                <el-table :data="filteredReceivables" stripe border>
                    <el-table-column prop="date" label="单据日期" width="120"></el-table-column>
                    <el-table-column prop="documentNo" label="单据编号" width="160"></el-table-column>
                    <el-table-column prop="customerName" label="客户名称"></el-table-column>
                    <el-table-column label="单据金额" width="120">
                        <template slot-scope="scope">
                            ¥{{ (scope.row.amount || 0).toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="已收金额" width="120">
                        <template slot-scope="scope">
                            <span class="green-text">¥{{ (scope.row.receivedAmount || 0).toFixed(2) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="未收金额" width="120">
                        <template slot-scope="scope">
                            <span class="red-text">¥{{ (getUnreceiveAmount(scope.row) || 0).toFixed(2) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="dueDate" label="到期日" width="120"></el-table-column>
                    <el-table-column label="状态" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getStatusType(scope.row)">
                                {{ getStatusText(scope.row) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="150" fixed="right">
                        <template slot-scope="scope">
                            <el-button 
                                size="mini" 
                                type="primary"
                                @click="handleReceive(scope.row)"
                                :disabled="isCompleted(scope.row)">收款</el-button>
                            <el-button 
                                size="mini"
                                @click="viewHistory(scope.row)">记录</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 收款对话框 -->
            <el-dialog 
                :title="showAddReceiveForm ? '新增应收' : '收款登记'"
                :visible.sync="receiveDialogVisible"
                width="30%">
                <el-form :model="receiveForm" :rules="rules" ref="receiveForm" label-width="100px">
                    <!-- 新增收款表单 -->
                    <template v-if="showAddReceiveForm">
                        <el-form-item label="客户" prop="customerId">
                            <el-select 
                                v-model="receiveForm.customerId" 
                                filterable 
                                placeholder="请选择客户"
                                style="width: 100%;">
                                <el-option
                                    v-for="customer in systemData.customers"
                                    :key="customer.id"
                                    :label="customer.name"
                                    :value="customer.id">
                                </el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item label="应收金额" prop="amount">
                            <el-input-number 
                                v-model="receiveForm.amount"
                                :min="0"
                                :precision="2"
                                style="width: 100%;">
                            </el-input-number>
                        </el-form-item>
                        <el-form-item label="到期日" prop="dueDate">
                            <el-date-picker
                                v-model="receiveForm.dueDate"
                                type="date"
                                placeholder="选择到期日"
                                style="width: 100%;">
                            </el-date-picker>
                        </el-form-item>
                    </template>
                    <!-- 收款表单 -->
                    <template v-else>
                        <el-form-item label="单据编号">
                            <span>{{ receiveForm.documentNo }}</span>
                        </el-form-item>
                        <el-form-item label="客户名称">
                            <span>{{ receiveForm.customerName }}</span>
                        </el-form-item>
                        <el-form-item label="应收金额">
                            <span>¥{{ (receiveForm.amount || 0).toFixed(2) }}</span>
                        </el-form-item>
                        <el-form-item label="已收金额">
                            <span>¥{{ (receiveForm.receivedAmount || 0).toFixed(2) }}</span>
                        </el-form-item>
                        <el-form-item label="本次收款" prop="receiveAmount">
                            <el-input-number 
                                v-model="receiveForm.receiveAmount"
                                :min="0"
                                :max="receiveForm.amount - receiveForm.receivedAmount"
                                :precision="2"
                                style="width: 100%;">
                            </el-input-number>
                        </el-form-item>
                        <el-form-item label="收款日期" prop="receiveDate">
                            <el-date-picker
                                v-model="receiveForm.receiveDate"
                                type="date"
                                placeholder="选择日期"
                                style="width: 100%;">
                            </el-date-picker>
                        </el-form-item>
                        <el-form-item label="收款方式" prop="receiveMethod">
                            <el-select v-model="receiveForm.receiveMethod" style="width: 100%;">
                                <el-option label="现金" value="cash"></el-option>
                                <el-option label="银行转账" value="bank"></el-option>
                                <el-option label="支票" value="check"></el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item label="备注" prop="remark">
                            <el-input 
                                type="textarea"
                                v-model="receiveForm.remark"
                                :rows="2">
                            </el-input>
                        </el-form-item>
                    </template>
                </el-form>
                <div slot="footer">
                    <el-button @click="receiveDialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="confirmReceive">确 定</el-button>
                </div>
            </el-dialog>

            <!-- 收款记录对话框 -->
            <el-dialog 
                title="收款记录" 
                :visible.sync="historyDialogVisible"
                width="50%">
                <el-table :data="receiveHistory" stripe border>
                    <el-table-column prop="date" label="收款日期" width="120"></el-table-column>
                    <el-table-column label="收款金额" width="120">
                        <template slot-scope="scope">
                            ¥{{ scope.row.amount.toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="method" label="收款方式" width="120">
                        <template slot-scope="scope">
                            {{ getMethodText(scope.row.method) }}
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
        }
    },

    data() {
        return {
            queryForm: {
                customerId: '',
                status: ''
            },
            receiveDialogVisible: false,
            historyDialogVisible: false,
            receiveForm: {
                documentNo: '',
                customerName: '',
                amount: 0,
                receivedAmount: 0,
                receiveAmount: 0,
                receiveDate: new Date().toISOString().split('T')[0],
                receiveMethod: 'cash',
                remark: ''
            },
            receiveHistory: [],
            showAddReceiveForm: false,
            rules: {
                receiveAmount: [
                    { required: true, message: '请输入收款金额', trigger: 'blur' },
                    { type: 'number', message: '金额必须为数字', trigger: 'blur' }
                ],
                receiveDate: [
                    { required: true, message: '请选择收款日期', trigger: 'change' }
                ],
                receiveMethod: [
                    { required: true, message: '请选择收款方式', trigger: 'change' }
                ],
                customerId: [
                    { required: true, message: '请选择客户', trigger: 'change' }
                ],
                amount: [
                    { required: true, message: '请输入应收金额', trigger: 'blur' },
                    { type: 'number', message: '金额必须为数字', trigger: 'blur' }
                ],
                dueDate: [
                    { required: true, message: '请选择到期日', trigger: 'change' }
                ]
            }
        }
    },

    computed: {
        // 根据条件筛选应收记录
        filteredReceivables() {
            let records = this.systemData.receivables?.records || [];
            
            if (this.queryForm.customerId) {
                records = records.filter(r => r.customerId === this.queryForm.customerId);
            }

            if (this.queryForm.status) {
                records = records.filter(r => this.getReceivableStatus(r) === this.queryForm.status);
            }

            return records;
        },

        // 应收总额
        totalAmount() {
            return this.systemData.receivables?.records?.reduce((sum, record) => 
                sum + (record.amount || 0), 0) || 0;
        },

        // 已收金额
        receivedAmount() {
            return this.systemData.receivables?.records?.reduce((sum, record) => 
                sum + (record.receivedAmount || 0), 0) || 0;
        },

        // 未收金额
        unreceiveAmount() {
            return (this.totalAmount || 0) - (this.receivedAmount || 0);
        },

        // 逾期金额
        overdueAmount() {
            const today = new Date();
            return this.systemData.receivables?.records
                ?.filter(record => record && record.dueDate)
                .filter(record => {
                    const dueDate = new Date(record.dueDate);
                    return dueDate < today && record.amount > (record.receivedAmount || 0);
                })
                .reduce((sum, record) => 
                    sum + ((record.amount || 0) - (record.receivedAmount || 0)), 0) || 0;
        }
    },

    methods: {
        // 获取未收金额
        getUnreceiveAmount(record) {
            return (record.amount || 0) - (record.receivedAmount || 0);
        },

        // 获取状态文本
        getStatusText(record) {
            const unreceive = (record.amount || 0) - (record.receivedAmount || 0);
            if (unreceive <= 0) return '已收款';
            if (record.receivedAmount > 0) return '部分收款';
            if (new Date(record.dueDate) < new Date()) return '已逾期';
            return '未收款';
        },

        // 获取应收状态
        getReceivableStatus(record) {
            const unreceive = (record.amount || 0) - (record.receivedAmount || 0);
            if (unreceive <= 0) return 'completed';
            if (record.receivedAmount > 0) return 'partial';
            if (new Date(record.dueDate) < new Date()) return 'overdue';
            return 'pending';
        },

        // 获取状态类型
        getStatusType(record) {
            const status = this.getReceivableStatus(record);
            switch (status) {
                case 'completed':
                    return 'success';
                case 'partial':
                    return 'warning';
                case 'overdue':
                    return 'danger';
                default:
                    return 'info';
            }
        },

        // 获取收款方式文本
        getMethodText(method) {
            switch (method) {
                case 'cash':
                    return '现金';
                case 'bank':
                    return '银行转账';
                case 'check':
                    return '支票';
                default:
                    return method;
            }
        },

        // 检查是否已完成
        isCompleted(record) {
            return record.amount <= record.receivedAmount;
        },

        // 检查是否逾期
        isOverdue(record) {
            if (this.isCompleted(record)) return false;
            const today = new Date();
            const dueDate = new Date(record.dueDate);
            return today > dueDate;
        },

        // 处理收款
        handleReceive(record) {
            // 确保 receivables 数据结构存在
            if (!this.systemData.receivables) {
                this.systemData.receivables = { records: [], total: 0 };
            }
            if (!this.systemData.receivables.records) {
                this.systemData.receivables.records = [];
            }

            // 如果没有传入 record，说明是点击顶部的"收款登记"按钮
            if (!record) {
                this.receiveForm = {
                    documentNo: '',
                    customerName: '',
                    amount: 0,
                    receivedAmount: 0,
                    receiveAmount: 0,
                    receiveDate: new Date().toISOString().split('T')[0],
                    receiveMethod: 'cash',
                    remark: '',
                    // 新增收款表单所需字段
                    customerId: '',
                    documentType: 'manual', // 手工录入
                    dueDate: ''
                };
                // 显示新增收款表单
                this.showAddReceiveForm = true;
                this.receiveDialogVisible = true;
                return;
            }

            // 处理已有应收记录的收款
            this.receiveForm = {
                documentNo: record.documentNo,
                customerName: record.customerName,
                amount: record.amount,
                receivedAmount: record.receivedAmount,
                receiveAmount: this.getUnreceiveAmount(record),
                receiveDate: new Date().toISOString().split('T')[0],
                receiveMethod: 'cash',
                remark: ''
            };
            this.showAddReceiveForm = false;
            this.receiveDialogVisible = true;
        },

        // 确认收款
        confirmReceive() {
            this.$refs.receiveForm.validate((valid) => {
                if (valid) {
                    if (this.showAddReceiveForm) {
                        // 新增应收记录
                        const customer = this.systemData.customers.find(
                            c => c.id === this.receiveForm.customerId
                        );
                        
                        const newRecord = {
                            documentNo: `AR${Date.now()}`,
                            date: new Date().toISOString().split('T')[0],
                            customerId: this.receiveForm.customerId,
                            customerName: customer.name,
                            amount: this.receiveForm.amount,
                            receivedAmount: 0,
                            dueDate: this.receiveForm.dueDate,
                            receiveRecords: []
                        };
                        
                        this.systemData.receivables.records.push(newRecord);
                        this.$emit('data-change');
                        this.receiveDialogVisible = false;
                        this.$message.success('新增应收成功');
                        return;
                    }

                    // 更新应收记录
                    const record = this.systemData.receivables.records.find(
                        r => r.documentNo === this.receiveForm.documentNo
                    );
                    
                    if (record) {
                        // 添加收款记录
                        if (!record.receiveRecords) {
                            record.receiveRecords = [];
                        }
                        
                        const receiveRecord = {
                            date: this.receiveForm.receiveDate,
                            amount: this.receiveForm.receiveAmount,
                            method: this.receiveForm.receiveMethod,
                            remark: this.receiveForm.remark
                        };
                        
                        record.receiveRecords.push(receiveRecord);
                        record.receivedAmount += this.receiveForm.receiveAmount;

                        // 添加现金流水记录
                        if (!this.systemData.cashFlow) {
                            this.systemData.cashFlow = { balance: 0, records: [] };
                        }

                        this.systemData.cashFlow.records.push({
                            id: `CF${Date.now()}`,
                            date: this.receiveForm.receiveDate,
                            type: '收入',
                            amount: this.receiveForm.receiveAmount,
                            relatedType: '应收收款',
                            relatedId: record.documentNo,
                            remark: `收到客户${record.customerName}的款项`
                        });

                        this.systemData.cashFlow.balance += this.receiveForm.receiveAmount;
                    }

                    this.$emit('data-change');
                    this.receiveDialogVisible = false;
                    this.$message.success('收款成功');
                }
            });
        },

        // 查看收款记录
        viewHistory(record) {
            this.receiveHistory = record.receiveRecords || [];
            this.historyDialogVisible = true;
        },

        // 导出应收明细
        exportReceivables() {
            // 生成CSV内容
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            csvContent += `应收账款明细表\n`;
            csvContent += `导出时间：${new Date().toLocaleString()}\n\n`;
            csvContent += `单据日期,单据编号,客户名称,单据金额,已收金额,未收金额,到期日,状态\n`;

            this.filteredReceivables.forEach(record => {
                csvContent += `${record.date},${record.documentNo},${record.customerName},` +
                    `${record.amount.toFixed(2)},${record.receivedAmount.toFixed(2)},` +
                    `${this.getUnreceiveAmount(record).toFixed(2)},${record.dueDate},` +
                    `${this.getStatusText(record)}\n`;
            });

            csvContent += `\n汇总信息\n`;
            csvContent += `应收总额,¥${this.totalAmount.toFixed(2)}\n`;
            csvContent += `已收金额,¥${this.receivedAmount.toFixed(2)}\n`;
            csvContent += `未收金额,¥${this.unreceiveAmount.toFixed(2)}\n`;
            csvContent += `逾期金额,¥${this.overdueAmount.toFixed(2)}\n`;

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `应收账款明细_${new Date().toLocaleDateString()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    },

    created() {
        // 确保数据结构初始化
        if (!this.systemData.receivables) {
            this.systemData.receivables = { records: [], total: 0 };
        }
        if (!this.systemData.receivables.records) {
            this.systemData.receivables.records = [];
        }
        // 确保每条记录都有必要的属性
        this.systemData.receivables.records.forEach(record => {
            record.amount = record.amount || 0;
            record.receivedAmount = record.receivedAmount || 0;
        });
    }
}); 