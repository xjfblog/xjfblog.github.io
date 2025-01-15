// 客户管理模块
Vue.component('customer-component', {
    template: `
        <div class="customer-management">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="8">
                            <el-button type="primary" @click="handleAdd">新增客户</el-button>
                        </el-col>
                        <el-col :span="8">
                            <el-input
                                placeholder="请输入客户名称搜索"
                                v-model="searchQuery"
                                clearable>
                                <i slot="prefix" class="el-icon-search"></i>
                            </el-input>
                        </el-col>
                    </el-row>
                </div>

                <!-- 客户列表 -->
                <el-table :data="filteredCustomers" stripe border>
                    <el-table-column prop="id" label="客户编号" width="100"></el-table-column>
                    <el-table-column prop="name" label="客户名称"></el-table-column>
                    <el-table-column prop="level" label="客户等级" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getCustomerLevelType(scope.row.level)">
                                {{ scope.row.level }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="信用额度" width="120">
                        <template slot-scope="scope">
                            ¥{{ scope.row.credit.toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="已用额度" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': getUsedCredit(scope.row.id) >= scope.row.credit}">
                                ¥{{ getUsedCredit(scope.row.id).toFixed(2) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="应收账款" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': getReceivableAmount(scope.row.id) > 0}">
                                ¥{{ getReceivableAmount(scope.row.id).toFixed(2) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="200" fixed="right">
                        <template slot-scope="scope">
                            <el-button size="mini" @click="handleEdit(scope.row)">编辑</el-button>
                            <el-button 
                                size="mini" 
                                type="danger" 
                                @click="handleDelete(scope.row)"
                                :disabled="isCustomerInUse(scope.row.id)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 客户编辑对话框 -->
            <el-dialog 
                :title="dialogTitle" 
                :visible.sync="dialogVisible"
                width="50%"
                @close="resetForm">
                <el-form 
                    :model="customerForm" 
                    :rules="rules" 
                    ref="customerForm" 
                    label-width="100px">
                    <el-form-item label="客户名称" prop="name">
                        <el-input v-model="customerForm.name"></el-input>
                    </el-form-item>
                    <el-form-item label="客户等级" prop="level">
                        <el-select v-model="customerForm.level" style="width: 100%;">
                            <el-option label="普通客户" value="普通客户"></el-option>
                            <el-option label="重要客户" value="重要客户"></el-option>
                            <el-option label="VIP客户" value="VIP客户"></el-option>
                        </el-select>
                    </el-form-item>
                    <el-form-item label="信用额度" prop="credit">
                        <el-input-number 
                            v-model="customerForm.credit"
                            :min="0"
                            :step="1000"
                            style="width: 100%;">
                        </el-input-number>
                    </el-form-item>
                    <el-form-item label="备注" prop="remark">
                        <el-input type="textarea" v-model="customerForm.remark"></el-input>
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
            isNewCustomer: true,
            customerForm: {
                id: null,
                name: '',
                level: '普通客户',
                credit: this.systemConfig.defaultCustomerCredit,
                remark: ''
            },
            rules: {
                name: [
                    { required: true, message: '请输入客户名称', trigger: 'blur' }
                ],
                level: [
                    { required: true, message: '请选择客户等级', trigger: 'change' }
                ],
                credit: [
                    { required: true, message: '请输入信用额度', trigger: 'blur' },
                    { type: 'number', min: 0, message: '信用额度必须大于0', trigger: 'blur' }
                ]
            }
        }
    },

    computed: {
        dialogTitle() {
            return this.isNewCustomer ? '新增客户' : '编辑客户';
        },

        filteredCustomers() {
            return this.systemData.customers.filter(customer =>
                customer.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }
    },

    methods: {
        getEmptyCustomerForm() {
            return {
                id: null,
                name: '',
                level: '普通客户',
                credit: this.systemConfig.defaultCustomerCredit,
                remark: ''
            };
        },

        handleAdd() {
            this.isNewCustomer = true;
            this.customerForm = this.getEmptyCustomerForm();
            this.dialogVisible = true;
        },

        handleEdit(row) {
            this.isNewCustomer = false;
            this.customerForm = { ...row };
            this.dialogVisible = true;
        },

        handleDelete(row) {
            if (this.isCustomerInUse(row.id)) {
                this.$message.warning('该客户有未完成的交易，不能删除');
                return;
            }

            this.$confirm('确认删除该客户吗？', '提示', {
                type: 'warning'
            }).then(() => {
                const index = this.systemData.customers.findIndex(item => item.id === row.id);
                this.systemData.customers.splice(index, 1);
                this.$emit('data-change');
                this.$message.success('删除成功');
            }).catch(() => {});
        },

        handleSave() {
            this.$refs.customerForm.validate((valid) => {
                if (valid) {
                    if (this.isNewCustomer) {
                        // 新增客户
                        const newId = Math.max(0, ...this.systemData.customers.map(p => p.id)) + 1;
                        this.customerForm.id = newId;
                        this.systemData.customers.push({ ...this.customerForm });
                    } else {
                        // 编辑客户
                        const index = this.systemData.customers.findIndex(item => item.id === this.customerForm.id);
                        this.systemData.customers.splice(index, 1, { ...this.customerForm });
                    }
                    this.$emit('data-change');
                    this.dialogVisible = false;
                    this.$message.success('保存成功');
                }
            });
        },

        resetForm() {
            this.$refs.customerForm?.resetFields();
        },

        // 获取客户等级标签类型
        getCustomerLevelType(level) {
            switch (level) {
                case 'VIP客户':
                    return 'success';
                case '重要客户':
                    return 'warning';
                default:
                    return 'info';
            }
        },

        // 获取客户已用信用额度
        getUsedCredit(customerId) {
            return this.systemData.receivables.records
                .filter(record => record.customerId === customerId)
                .reduce((total, record) => total + (record.amount - record.paidAmount), 0);
        },

        // 获取客户的应收账款金额
        getReceivableAmount(customerId) {
            return this.systemData.receivables.records
                .filter(record => record.customerId === customerId)
                .reduce((total, record) => total + (record.amount - record.paidAmount), 0);
        },

        // 检查客户是否有未完成的交易
        isCustomerInUse(customerId) {
            // 检查是否有未完成的销售订单
            const hasUnfinishedSales = this.systemData.sales.some(
                order => order.customerId === customerId && order.status !== '已完成'
            );

            // 检查是否有未结清的应收账款
            const hasUnpaidReceivables = this.getReceivableAmount(customerId) > 0;

            return hasUnfinishedSales || hasUnpaidReceivables;
        }
    }
}); 