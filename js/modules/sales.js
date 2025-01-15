// 销售管理模块 - 销售订单
Vue.component('sales-order-component', {
    template: `
        <div class="sales-order">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="8">
                            <el-button type="primary" @click="handleCreateOrder">新增销售订单</el-button>
                        </el-col>
                        <el-col :span="8">
                            <el-input
                                placeholder="请输入订单号搜索"
                                v-model="searchQuery"
                                clearable>
                                <i slot="prefix" class="el-icon-search"></i>
                            </el-input>
                        </el-col>
                    </el-row>
                </div>

                <!-- 销售订单列表 -->
                <el-table :data="filteredOrders" stripe border>
                    <el-table-column prop="orderNo" label="订单编号" width="160"></el-table-column>
                    <el-table-column prop="customerName" label="客户"></el-table-column>
                    <el-table-column prop="orderDate" label="订单日期" width="120"></el-table-column>
                    <el-table-column label="订单金额" width="120">
                        <template slot-scope="scope">
                            ¥{{ scope.row.totalAmount.toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="paymentMethod" label="支付方式" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="scope.row.paymentMethod === '现金' ? 'success' : 'warning'">
                                {{ scope.row.paymentMethod }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="status" label="订单状态" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getOrderStatusType(scope.row.status)">
                                {{ scope.row.status }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="250" fixed="right">
                        <template slot-scope="scope">
                            <el-button size="mini" @click="handleViewOrder(scope.row)">查看</el-button>
                            <el-button 
                                size="mini" 
                                type="primary" 
                                @click="handleEditOrder(scope.row)"
                                :disabled="scope.row.status === '已完成'">编辑</el-button>
                            <el-button 
                                size="mini" 
                                type="success" 
                                @click="handleCompleteOrder(scope.row)"
                                :disabled="scope.row.status === '已完成'">完成</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 销售订单编辑对话框 -->
            <el-dialog 
                :title="dialogTitle" 
                :visible.sync="dialogVisible"
                width="80%"
                :close-on-click-modal="false"
                @close="resetForm">
                <el-form 
                    :model="orderForm" 
                    :rules="rules" 
                    ref="orderForm" 
                    label-width="100px">
                    <el-row :gutter="20">
                        <el-col :span="8">
                            <el-form-item label="客户" prop="customerId">
                                <el-select 
                                    v-model="orderForm.customerId" 
                                    placeholder="请选择客户"
                                    filterable
                                    @change="handleCustomerChange">
                                    <el-option
                                        v-for="customer in systemData.customers"
                                        :key="customer.id"
                                        :label="customer.name"
                                        :value="customer.id">
                                        <span style="float: left">{{ customer.name }}</span>
                                        <span style="float: right; color: #8492a6; font-size: 13px">
                                            剩余额度: ¥{{ getCustomerAvailableCredit(customer).toFixed(2) }}
                                        </span>
                                    </el-option>
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="8">
                            <el-form-item label="订单日期" prop="orderDate">
                                <el-date-picker
                                    v-model="orderForm.orderDate"
                                    type="date"
                                    placeholder="选择日期">
                                </el-date-picker>
                            </el-form-item>
                        </el-col>
                        <el-col :span="8">
                            <el-form-item label="支付方式" prop="paymentMethod">
                                <el-radio-group v-model="orderForm.paymentMethod">
                                    <el-radio label="现金">现金</el-radio>
                                    <el-radio label="欠账">欠账</el-radio>
                                </el-radio-group>
                            </el-form-item>
                        </el-col>
                    </el-row>

                    <!-- 订单明细 -->
                    <el-card class="box-card" style="margin-top: 20px;">
                        <div slot="header">
                            <span>订单明细</span>
                            <el-button 
                                style="float: right; padding: 3px 0" 
                                type="text"
                                @click="handleAddOrderItem">
                                添加商品
                            </el-button>
                        </div>
                        <el-table :data="orderForm.items" border>
                            <el-table-column label="商品名称" width="180">
                                <template slot-scope="scope">
                                    <el-select 
                                        v-model="scope.row.productId" 
                                        placeholder="选择商品"
                                        filterable
                                        @change="(val) => handleProductSelect(val, scope.$index)">
                                        <el-option
                                            v-for="product in availableProducts"
                                            :key="product.id"
                                            :label="product.name"
                                            :value="product.id">
                                            <span style="float: left">{{ product.name }}</span>
                                            <span style="float: right; color: #8492a6; font-size: 13px">
                                                库存: {{ product.stock }}{{ product.unit }}
                                            </span>
                                        </el-option>
                                    </el-select>
                                </template>
                            </el-table-column>
                            <el-table-column prop="productName" label="商品信息" width="180"></el-table-column>
                            <el-table-column label="单价">
                                <template slot-scope="scope">
                                    <el-input-number 
                                        v-model="scope.row.price" 
                                        :precision="2" 
                                        :min="0"
                                        @change="calculateItemAmount(scope.$index)">
                                    </el-input-number>
                                </template>
                            </el-table-column>
                            <el-table-column label="数量">
                                <template slot-scope="scope">
                                    <el-input-number 
                                        v-model="scope.row.quantity" 
                                        :min="1"
                                        :max="getMaxQuantity(scope.row.productId)"
                                        @change="calculateItemAmount(scope.$index)">
                                    </el-input-number>
                                </template>
                            </el-table-column>
                            <el-table-column label="金额">
                                <template slot-scope="scope">
                                    ¥{{ scope.row.amount.toFixed(2) }}
                                </template>
                            </el-table-column>
                            <el-table-column label="操作" width="100">
                                <template slot-scope="scope">
                                    <el-button 
                                        type="danger" 
                                        size="mini" 
                                        icon="el-icon-delete"
                                        @click="handleRemoveOrderItem(scope.$index)">
                                        删除
                                    </el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                        <div style="margin-top: 20px; text-align: right;">
                            <span style="margin-right: 20px;">
                                订单总金额：¥{{ orderForm.totalAmount.toFixed(2) }}
                            </span>
                        </div>
                    </el-card>

                    <el-form-item label="备注" prop="remark">
                        <el-input type="textarea" v-model="orderForm.remark"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="dialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="handleSaveOrder">确 定</el-button>
                </div>
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
            searchQuery: '',
            dialogVisible: false,
            isNewOrder: true,
            orderForm: this.getEmptyOrderForm(),
            rules: {
                customerId: [
                    { required: true, message: '请选择客户', trigger: 'change' }
                ],
                orderDate: [
                    { required: true, message: '请选择订单日期', trigger: 'change' }
                ],
                paymentMethod: [
                    { required: true, message: '请选择支付方式', trigger: 'change' }
                ]
            }
        }
    },

    computed: {
        dialogTitle() {
            return this.isNewOrder ? '新增销售订单' : '编辑销售订单';
        },

        filteredOrders() {
            return this.systemData.sales.filter(order =>
                order.orderNo.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        },

        // 获取有库存的商品列表
        availableProducts() {
            return this.systemData.products.filter(product => product.stock > 0);
        }
    },

    methods: {
        // 获取空的订单表单
        getEmptyOrderForm() {
            return {
                id: null,
                orderNo: '',
                customerId: null,
                customerName: '',
                orderDate: new Date().toISOString().split('T')[0],
                paymentMethod: '现金',
                status: '未完成',
                items: [],
                totalAmount: 0,
                remark: ''
            };
        },

        // 获取空的订单项
        getEmptyOrderItem() {
            return {
                productId: null,
                productName: '',
                price: 0,
                quantity: 1,
                amount: 0
            };
        },

        // 获取客户可用信用额度
        getCustomerAvailableCredit(customer) {
            const usedCredit = this.systemData.receivables.records
                .filter(record => record.customerId === customer.id)
                .reduce((total, record) => total + (record.amount - record.paidAmount), 0);
            return customer.credit - usedCredit;
        },

        // 获取商品最大可售数量
        getMaxQuantity(productId) {
            const product = this.systemData.products.find(p => p.id === productId);
            return product ? product.stock : 0;
        },

        // 创建新订单
        handleCreateOrder() {
            this.isNewOrder = true;
            this.orderForm = this.getEmptyOrderForm();
            // 生成订单编号：SO + 年月日 + 4位序号
            const date = new Date();
            const dateStr = date.getFullYear() +
                String(date.getMonth() + 1).padStart(2, '0') +
                String(date.getDate()).padStart(2, '0');
            const lastOrder = this.systemData.sales[this.systemData.sales.length - 1];
            const lastNum = lastOrder ? parseInt(lastOrder.orderNo.slice(-4)) : 0;
            this.orderForm.orderNo = `SO${dateStr}${String(lastNum + 1).padStart(4, '0')}`;
            this.dialogVisible = true;
        },

        // 查看订单
        handleViewOrder(row) {
            this.isNewOrder = false;
            this.orderForm = { ...row };
            this.dialogVisible = true;
            // 设置为只读模式
            this.$nextTick(() => {
                if (this.$refs.orderForm) {
                    this.$refs.orderForm.disabled = true;
                }
            });
        },

        // 编辑订单
        handleEditOrder(row) {
            if (row.status === '已完成') {
                this.$message.warning('已完成的订单不能修改');
                return;
            }
            this.isNewOrder = false;
            this.orderForm = { ...row };
            this.dialogVisible = true;
        },

        // 完成订单
        handleCompleteOrder(row) {
            if (row.items.length === 0) {
                this.$message.warning('订单中没有商品，不能完成订单');
                return;
            }

            // 检查库存
            for (const item of row.items) {
                const product = this.systemData.products.find(p => p.id === item.productId);
                if (!product || product.stock < item.quantity) {
                    this.$message.error(`商品 ${item.productName} 库存不足！`);
                    return;
                }
            }

            // 检查信用额度（如果是欠账方式）
            if (row.paymentMethod === '欠账') {
                const customer = this.systemData.customers.find(c => c.id === row.customerId);
                if (customer) {
                    const availableCredit = this.getCustomerAvailableCredit(customer);
                    if (availableCredit < row.totalAmount) {
                        this.$message.error('客户信用额度不足！');
                        return;
                    }
                }
            }

            this.$confirm('确认完成该销售订单吗？完成后将更新库存并不可修改', '提示', {
                type: 'warning'
            }).then(() => {
                // 1. 更新库存
                row.items.forEach(item => {
                    const product = this.systemData.products.find(p => p.id === item.productId);
                    if (product) {
                        product.stock -= item.quantity;
                    }
                });

                // 2. 根据支付方式处理账务
                if (row.paymentMethod === '现金') {
                    // 生成现金收入记录
                    const cashFlowRecord = {
                        id: `CF${Date.now()}`,
                        date: row.orderDate,
                        type: '收入',
                        amount: row.totalAmount,
                        relatedId: row.id,
                        relatedType: '销售收款',
                        remark: `销售订单${row.orderNo}收款`
                    };
                    this.systemData.cashFlow.records.push(cashFlowRecord);
                    this.systemData.cashFlow.balance += row.totalAmount;
                } else if (row.paymentMethod === '欠账') {
                    // 生成应收账款记录
                    const receivableRecord = {
                        id: `RE${Date.now()}`,
                        customerId: row.customerId,
                        date: row.orderDate,
                        amount: row.totalAmount,
                        orderId: row.id,
                        status: '未收款',
                        paidAmount: 0,
                        remark: `销售订单${row.orderNo}`
                    };
                    this.systemData.receivables.records.push(receivableRecord);
                    this.systemData.receivables.total += row.totalAmount;
                }

                // 3. 更新订单状态
                row.status = '已完成';
                this.$emit('data-change');
                this.$message.success('订单已完成');
            }).catch(() => {});
        },

        // 客户选择改变
        handleCustomerChange(customerId) {
            const customer = this.systemData.customers.find(c => c.id === customerId);
            if (customer) {
                this.orderForm.customerName = customer.name;
            }
        },

        // 添加订单项
        handleAddOrderItem() {
            this.orderForm.items.push(this.getEmptyOrderItem());
        },

        // 商品选择改变
        handleProductSelect(productId, index) {
            const product = this.systemData.products.find(p => p.id === productId);
            if (product) {
                this.orderForm.items[index].productName = product.name;
                this.orderForm.items[index].price = product.salePrice;
                this.calculateItemAmount(index);
            }
        },

        // 计算订单项金额
        calculateItemAmount(index) {
            const item = this.orderForm.items[index];
            item.amount = item.price * item.quantity;
            // 重新计算订单总金额
            this.orderForm.totalAmount = this.orderForm.items.reduce(
                (sum, item) => sum + item.amount, 0
            );
        },

        // 移除订单项
        handleRemoveOrderItem(index) {
            this.orderForm.items.splice(index, 1);
            // 重新计算订单总金额
            this.orderForm.totalAmount = this.orderForm.items.reduce(
                (sum, item) => sum + item.amount, 0
            );
        },

        // 保存订单
        handleSaveOrder() {
            this.$refs.orderForm.validate((valid) => {
                if (valid) {
                    if (this.orderForm.items.length === 0) {
                        this.$message.warning('请至少添加一个商品');
                        return;
                    }

                    // 检查库存
                    for (const item of this.orderForm.items) {
                        const maxQuantity = this.getMaxQuantity(item.productId);
                        if (item.quantity > maxQuantity) {
                            this.$message.error(`商品 ${item.productName} 库存不足！`);
                            return;
                        }
                    }

                    // 检查信用额度（如果是欠账方式）
                    if (this.orderForm.paymentMethod === '欠账') {
                        const customer = this.systemData.customers.find(c => c.id === this.orderForm.customerId);
                        if (customer) {
                            const availableCredit = this.getCustomerAvailableCredit(customer);
                            if (availableCredit < this.orderForm.totalAmount) {
                                this.$message.error('客户信用额度不足！');
                                return;
                            }
                        }
                    }

                    if (this.isNewOrder) {
                        // 新增订单
                        const newId = Math.max(0, ...this.systemData.sales.map(p => p.id)) + 1;
                        this.orderForm.id = newId;
                        this.systemData.sales.push({ ...this.orderForm });
                    } else {
                        // 编辑订单
                        const index = this.systemData.sales.findIndex(item => item.id === this.orderForm.id);
                        this.systemData.sales.splice(index, 1, { ...this.orderForm });
                    }
                    this.$emit('data-change');
                    this.dialogVisible = false;
                    this.$message.success('保存成功');
                }
            });
        },

        // 重置表单
        resetForm() {
            this.$refs.orderForm?.resetFields();
        },

        // 获取订单状态标签类型
        getOrderStatusType(status) {
            switch (status) {
                case '已完成':
                    return 'success';
                case '未完成':
                    return 'warning';
                default:
                    return 'info';
            }
        }
    }
}) 

// 销售退货组件
Vue.component('sales-return-component', {
    template: `
        <div class="sales-return">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="8">
                            <el-button type="primary" @click="handleCreateReturn">新增退货单</el-button>
                        </el-col>
                        <el-col :span="8">
                            <el-input
                                placeholder="请输入退货单号搜索"
                                v-model="searchQuery"
                                clearable>
                                <i slot="prefix" class="el-icon-search"></i>
                            </el-input>
                        </el-col>
                    </el-row>
                </div>

                <!-- 退货单列表 -->
                <el-table :data="filteredReturns" stripe border>
                    <el-table-column prop="returnNo" label="退货单号" width="160"></el-table-column>
                    <el-table-column prop="orderNo" label="关联订单号" width="160"></el-table-column>
                    <el-table-column prop="customerName" label="客户"></el-table-column>
                    <el-table-column prop="returnDate" label="退货日期" width="120"></el-table-column>
                    <el-table-column label="退货金额" width="120">
                        <template slot-scope="scope">
                            ¥{{ scope.row.totalAmount.toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="status" label="状态" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getStatusType(scope.row.status)">
                                {{ scope.row.status }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="250" fixed="right">
                        <template slot-scope="scope">
                            <el-button size="mini" @click="handleViewReturn(scope.row)">查看</el-button>
                            <el-button 
                                size="mini" 
                                type="primary" 
                                @click="handleEditReturn(scope.row)"
                                :disabled="scope.row.status === '已完成'">编辑</el-button>
                            <el-button 
                                size="mini" 
                                type="success" 
                                @click="handleCompleteReturn(scope.row)"
                                :disabled="scope.row.status === '已完成'">完成</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 退货单编辑对话框 -->
            <el-dialog 
                :title="dialogTitle" 
                :visible.sync="dialogVisible"
                width="80%"
                :close-on-click-modal="false"
                @close="resetForm">
                <el-form 
                    :model="returnForm" 
                    :rules="rules" 
                    ref="returnForm" 
                    label-width="100px">
                    <el-row :gutter="20">
                        <el-col :span="8">
                            <el-form-item label="关联订单" prop="orderId">
                                <el-select 
                                    v-model="returnForm.orderId" 
                                    placeholder="请选择销售订单"
                                    filterable
                                    @change="handleOrderSelect">
                                    <el-option
                                        v-for="order in completedOrders"
                                        :key="order.id"
                                        :label="order.orderNo"
                                        :value="order.id">
                                        <span style="float: left">{{ order.orderNo }}</span>
                                        <span style="float: right; color: #8492a6; font-size: 13px">
                                            {{ order.customerName }}
                                        </span>
                                    </el-option>
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="8">
                            <el-form-item label="退货日期" prop="returnDate">
                                <el-date-picker
                                    v-model="returnForm.returnDate"
                                    type="date"
                                    placeholder="选择日期">
                                </el-date-picker>
                            </el-form-item>
                        </el-col>
                        <el-col :span="8">
                            <el-form-item label="状态">
                                <el-tag>{{ returnForm.status }}</el-tag>
                            </el-form-item>
                        </el-col>
                    </el-row>

                    <!-- 退货明细 -->
                    <el-card class="box-card" style="margin-top: 20px;">
                        <div slot="header">
                            <span>退货明细</span>
                        </div>
                        <el-table :data="returnForm.items" border>
                            <el-table-column prop="productName" label="商品名称" width="180"></el-table-column>
                            <el-table-column label="单价" width="120">
                                <template slot-scope="scope">
                                    ¥{{ scope.row.price.toFixed(2) }}
                                </template>
                            </el-table-column>
                            <el-table-column label="可退数量" width="120">
                                <template slot-scope="scope">
                                    {{ scope.row.maxQuantity }}
                                </template>
                            </el-table-column>
                            <el-table-column label="退货数量" width="150">
                                <template slot-scope="scope">
                                    <el-input-number 
                                        v-model="scope.row.quantity" 
                                        :min="0" 
                                        :max="scope.row.maxQuantity"
                                        @change="calculateReturnItemAmount(scope.$index)">
                                    </el-input-number>
                                </template>
                            </el-table-column>
                            <el-table-column label="金额">
                                <template slot-scope="scope">
                                    ¥{{ scope.row.amount.toFixed(2) }}
                                </template>
                            </el-table-column>
                        </el-table>
                        <div style="margin-top: 20px; text-align: right;">
                            <span style="margin-right: 20px;">
                                退货总金额：¥{{ returnForm.totalAmount.toFixed(2) }}
                            </span>
                        </div>
                    </el-card>

                    <el-form-item label="退货原因" prop="reason">
                        <el-input type="textarea" v-model="returnForm.reason"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="dialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="handleSaveReturn">确 定</el-button>
                </div>
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
            searchQuery: '',
            dialogVisible: false,
            isNewReturn: true,
            returnForm: this.getEmptyReturnForm(),
            rules: {
                orderId: [
                    { required: true, message: '请选择关联订单', trigger: 'change' }
                ],
                returnDate: [
                    { required: true, message: '请选择退货日期', trigger: 'change' }
                ],
                reason: [
                    { required: true, message: '请输入退货原因', trigger: 'blur' }
                ]
            }
        }
    },

    computed: {
        dialogTitle() {
            return this.isNewReturn ? '新增退货单' : '编辑退货单';
        },

        filteredReturns() {
            return this.systemData.salesReturns.filter(ret =>
                ret.returnNo.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        },

        // 获取已完成的销售订单
        completedOrders() {
            return this.systemData.sales.filter(order => 
                order.status === '已完成' && 
                !this.systemData.salesReturns.some(ret => 
                    ret.orderId === order.id && ret.status === '已完成'
                )
            );
        }
    },

    methods: {
        // 获取空的退货单表单
        getEmptyReturnForm() {
            return {
                id: null,
                returnNo: '',
                orderId: null,
                orderNo: '',
                customerId: null,
                customerName: '',
                returnDate: new Date().toISOString().split('T')[0],
                status: '未完成',
                items: [],
                totalAmount: 0,
                reason: ''
            };
        },

        // 创建新退货单
        handleCreateReturn() {
            this.isNewReturn = true;
            this.returnForm = this.getEmptyReturnForm();
            // 生成退货单号：SR + 年月日 + 4位序号
            const date = new Date();
            const dateStr = date.getFullYear() +
                String(date.getMonth() + 1).padStart(2, '0') +
                String(date.getDate()).padStart(2, '0');
            const lastReturn = this.systemData.salesReturns[this.systemData.salesReturns.length - 1];
            const lastNum = lastReturn ? parseInt(lastReturn.returnNo.slice(-4)) : 0;
            this.returnForm.returnNo = `SR${dateStr}${String(lastNum + 1).padStart(4, '0')}`;
            this.dialogVisible = true;
        },

        // 查看退货单
        handleViewReturn(row) {
            this.isNewReturn = false;
            this.returnForm = { ...row };
            this.dialogVisible = true;
            // 设置为只读模式
            this.$nextTick(() => {
                if (this.$refs.returnForm) {
                    this.$refs.returnForm.disabled = true;
                }
            });
        },

        // 编辑退货单
        handleEditReturn(row) {
            if (row.status === '已完成') {
                this.$message.warning('已完成的退货单不能修改');
                return;
            }
            this.isNewReturn = false;
            this.returnForm = { ...row };
            this.dialogVisible = true;
        },

        // 完成退货单
        handleCompleteReturn(row) {
            if (row.items.length === 0 || row.items.every(item => item.quantity === 0)) {
                this.$message.warning('退货单中没有商品或退货数量为0，不能完成退货');
                return;
            }

            this.$confirm('确认完成该退货单吗？完成后将更新库存并不可修改', '提示', {
                type: 'warning'
            }).then(() => {
                // 1. 更新库存
                row.items.forEach(item => {
                    const product = this.systemData.products.find(p => p.id === item.productId);
                    if (product) {
                        product.stock += item.quantity;
                    }
                });

                // 2. 处理财务记录
                // 查找原订单
                const originalOrder = this.systemData.sales.find(order => order.id === row.orderId);
                if (originalOrder && originalOrder.paymentMethod === '现金') {
                    // 如果原订单是现金支付，则生成现金支出记录
                    const cashFlowRecord = {
                        id: `CF${Date.now()}`,
                        date: row.returnDate,
                        type: '支出',
                        amount: row.totalAmount,
                        relatedId: row.id,
                        relatedType: '销售退货',
                        remark: `销售退货单${row.returnNo}退款`
                    };
                    this.systemData.cashFlow.records.push(cashFlowRecord);
                    this.systemData.cashFlow.balance -= row.totalAmount;
                } else {
                    // 如果是欠账，则减少应收账款
                    const receivableRecord = {
                        id: `RE${Date.now()}`,
                        customerId: row.customerId,
                        date: row.returnDate,
                        amount: -row.totalAmount,
                        orderId: row.id,
                        status: '已完成',
                        paidAmount: -row.totalAmount,
                        remark: `销售退货单${row.returnNo}`
                    };
                    this.systemData.receivables.records.push(receivableRecord);
                    this.systemData.receivables.total -= row.totalAmount;
                }

                // 3. 更新退货单状态
                row.status = '已完成';
                this.$emit('data-change');
                this.$message.success('退货单已完成');
            }).catch(() => {});
        },

        // 选择销售订单
        handleOrderSelect(orderId) {
            const order = this.systemData.sales.find(o => o.id === orderId);
            if (order) {
                this.returnForm.orderNo = order.orderNo;
                this.returnForm.customerId = order.customerId;
                this.returnForm.customerName = order.customerName;
                
                // 加载订单商品明细
                this.returnForm.items = order.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    price: item.price,
                    maxQuantity: item.quantity,
                    quantity: 0,
                    amount: 0
                }));
            }
        },

        // 计算退货项金额
        calculateReturnItemAmount(index) {
            const item = this.returnForm.items[index];
            item.amount = item.price * item.quantity;
            // 重新计算退货单总金额
            this.returnForm.totalAmount = this.returnForm.items.reduce(
                (sum, item) => sum + item.amount, 0
            );
        },

        // 保存退货单
        handleSaveReturn() {
            this.$refs.returnForm.validate((valid) => {
                if (valid) {
                    if (this.returnForm.items.every(item => item.quantity === 0)) {
                        this.$message.warning('请至少填写一个商品的退货数量');
                        return;
                    }

                    if (this.isNewReturn) {
                        // 新增退货单
                        const newId = Math.max(0, ...this.systemData.salesReturns.map(p => p.id)) + 1;
                        this.returnForm.id = newId;
                        this.systemData.salesReturns.push({ ...this.returnForm });
                    } else {
                        // 编辑退货单
                        const index = this.systemData.salesReturns.findIndex(item => item.id === this.returnForm.id);
                        this.systemData.salesReturns.splice(index, 1, { ...this.returnForm });
                    }
                    this.$emit('data-change');
                    this.dialogVisible = false;
                    this.$message.success('保存成功');
                }
            });
        },

        // 重置表单
        resetForm() {
            this.$refs.returnForm?.resetFields();
        },

        // 获取状态标签类型
        getStatusType(status) {
            switch (status) {
                case '已完成':
                    return 'success';
                case '未完成':
                    return 'warning';
                default:
                    return 'info';
            }
        }
    }
}) 

// 客户对账组件
Vue.component('customer-bill-component', {
    template: `
        <div class="customer-bill">
            <el-card>
                <div slot="header">
                    <el-row :gutter="20">
                        <el-col :span="8">
                            <el-select 
                                v-model="selectedCustomerId" 
                                placeholder="请选择客户"
                                filterable 
                                @change="handleCustomerChange">
                                <el-option
                                    v-for="customer in systemData.customers"
                                    :key="customer.id"
                                    :label="customer.name"
                                    :value="customer.id">
                                </el-option>
                            </el-select>
                        </el-col>
                        <el-col :span="12">
                            <el-date-picker
                                v-model="dateRange"
                                type="daterange"
                                range-separator="至"
                                start-placeholder="开始日期"
                                end-placeholder="结束日期"
                                @change="handleDateRangeChange">
                            </el-date-picker>
                        </el-col>
                    </el-row>
                </div>

                <!-- 账单汇总信息 -->
                <el-row :gutter="20" style="margin-bottom: 20px;">
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">销售总额</div>
                            <div class="amount-text">¥{{ summary.totalSales.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">退货总额</div>
                            <div class="amount-text">¥{{ summary.totalReturn.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">已收金额</div>
                            <div class="amount-text green-text">¥{{ summary.totalReceived.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">应收余额</div>
                            <div class="amount-text" :class="{'red-text': summary.balance > 0}">
                                ¥{{ summary.balance.toFixed(2) }}
                            </div>
                        </el-card>
                    </el-col>
                </el-row>

                <!-- 交易明细表 -->
                <el-table :data="billDetails" stripe border>
                    <el-table-column prop="date" label="日期" width="120"></el-table-column>
                    <el-table-column prop="documentNo" label="单据编号" width="160"></el-table-column>
                    <el-table-column prop="type" label="类型" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getTransactionType(scope.row.type)">
                                {{ scope.row.type }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="金额" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': scope.row.type === '销售'}">
                                ¥{{ Math.abs(scope.row.amount).toFixed(2) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="余额" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': scope.row.balance > 0}">
                                ¥{{ scope.row.balance.toFixed(2) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="remark" label="备注"></el-table-column>
                    <el-table-column label="操作" width="180" fixed="right">
                        <template slot-scope="scope">
                            <el-button 
                                size="mini" 
                                @click="handleViewDetail(scope.row)">查看明细</el-button>
                            <el-button 
                                size="mini" 
                                type="primary"
                                v-if="scope.row.type === '销售' && scope.row.paymentStatus !== '已收款'"
                                @click="handlePayment(scope.row)">收款</el-button>
                        </template>
                    </el-table-column>
                </el-table>

                <!-- 导出按钮 -->
                <div style="margin-top: 20px; text-align: right;">
                    <el-button type="primary" @click="exportBill">导出对账单</el-button>
                </div>
            </el-card>

            <!-- 收款对话框 -->
            <el-dialog 
                title="收款" 
                :visible.sync="paymentDialogVisible"
                width="30%">
                <el-form :model="paymentForm" label-width="100px">
                    <el-form-item label="收款金额">
                        <el-input-number 
                            v-model="paymentForm.amount"
                            :min="0"
                            :max="paymentForm.maxAmount"
                            :precision="2">
                        </el-input-number>
                    </el-form-item>
                    <el-form-item label="备注">
                        <el-input type="textarea" v-model="paymentForm.remark"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="paymentDialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="handleConfirmPayment">确 定</el-button>
                </div>
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
            selectedCustomerId: null,
            dateRange: [],
            summary: {
                totalSales: 0,
                totalReturn: 0,
                totalReceived: 0,
                balance: 0
            },
            billDetails: [],
            paymentDialogVisible: false,
            paymentForm: {
                documentNo: '',
                amount: 0,
                maxAmount: 0,
                remark: ''
            }
        }
    },

    methods: {
        // 处理客户选择变化
        handleCustomerChange() {
            this.calculateBill();
        },

        // 处理日期范围变化
        handleDateRangeChange() {
            this.calculateBill();
        },

        // 计算对账单
        calculateBill() {
            if (!this.selectedCustomerId || !this.dateRange.length) {
                this.billDetails = [];
                this.summary = {
                    totalSales: 0,
                    totalReturn: 0,
                    totalReceived: 0,
                    balance: 0
                };
                return;
            }

            // 获取所有相关交易
            const transactions = [];
            let balance = 0;

            // 添加销售订单
            this.systemData.sales
                .filter(order => 
                    order.customerId === this.selectedCustomerId &&
                    order.status === '已完成' &&
                    this.isDateInRange(order.orderDate)
                )
                .forEach(order => {
                    balance += order.totalAmount;
                    transactions.push({
                        date: order.orderDate,
                        documentNo: order.orderNo,
                        type: '销售',
                        amount: order.totalAmount,
                        balance: balance,
                        paymentStatus: order.paymentMethod === '现金' ? '已收款' : '未收款',
                        remark: order.remark || '',
                        details: order.items
                    });
                });

            // 添加退货记录
            this.systemData.salesReturns
                .filter(ret => 
                    ret.customerId === this.selectedCustomerId &&
                    ret.status === '已完成' &&
                    this.isDateInRange(ret.returnDate)
                )
                .forEach(ret => {
                    balance -= ret.totalAmount;
                    transactions.push({
                        date: ret.returnDate,
                        documentNo: ret.returnNo,
                        type: '退货',
                        amount: -ret.totalAmount,
                        balance: balance,
                        remark: ret.reason || '',
                        details: ret.items
                    });
                });

            // 添加收款记录
            this.systemData.receivables.records
                .filter(record => 
                    record.customerId === this.selectedCustomerId &&
                    record.status === '已收款' &&
                    this.isDateInRange(record.date)
                )
                .forEach(record => {
                    balance -= record.paidAmount;
                    transactions.push({
                        date: record.date,
                        documentNo: record.id,
                        type: '收款',
                        amount: -record.paidAmount,
                        balance: balance,
                        remark: record.remark || ''
                    });
                });

            // 按日期排序
            this.billDetails = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

            // 更新汇总信息
            this.summary = {
                totalSales: transactions
                    .filter(t => t.type === '销售')
                    .reduce((sum, t) => sum + t.amount, 0),
                totalReturn: Math.abs(transactions
                    .filter(t => t.type === '退货')
                    .reduce((sum, t) => sum + t.amount, 0)),
                totalReceived: Math.abs(transactions
                    .filter(t => t.type === '收款')
                    .reduce((sum, t) => sum + t.amount, 0)),
                balance: balance
            };
        },

        // 检查日期是否在选择的范围内
        isDateInRange(date) {
            const checkDate = new Date(date);
            return checkDate >= this.dateRange[0] && checkDate <= this.dateRange[1];
        },

        // 获取交易类型的标签样式
        getTransactionType(type) {
            switch (type) {
                case '销售':
                    return 'danger';
                case '退货':
                    return 'warning';
                case '收款':
                    return 'success';
                default:
                    return 'info';
            }
        },

        // 查看交易明细
        handleViewDetail(row) {
            if (!row.details) {
                this.$message.info('该记录没有明细信息');
                return;
            }

            const detailsHtml = row.details.map(item => 
                `<p>${item.productName} × ${item.quantity} = ¥${item.amount.toFixed(2)}</p>`
            ).join('');

            this.$alert(
                `<div>
                    <h3>交易明细</h3>
                    <p>日期：${row.date}</p>
                    <p>单据编号：${row.documentNo}</p>
                    <p>类型：${row.type}</p>
                    <p>金额：¥${Math.abs(row.amount).toFixed(2)}</p>
                    <p>备注：${row.remark || '无'}</p>
                    <h4>商品明细：</h4>
                    ${detailsHtml}
                </div>`,
                '交易明细',
                {
                    dangerouslyUseHTMLString: true,
                    confirmButtonText: '确定'
                }
            );
        },

        // 处理收款
        handlePayment(row) {
            this.paymentForm = {
                documentNo: row.documentNo,
                amount: row.amount,
                maxAmount: row.amount,
                remark: ''
            };
            this.paymentDialogVisible = true;
        },

        // 确认收款
        handleConfirmPayment() {
            if (this.paymentForm.amount <= 0) {
                this.$message.warning('请输入正确的收款金额');
                return;
            }

            // 生成收款记录
            const paymentRecord = {
                id: `REC${Date.now()}`,
                customerId: this.selectedCustomerId,
                date: new Date().toISOString().split('T')[0],
                amount: this.paymentForm.amount,
                documentNo: this.paymentForm.documentNo,
                status: '已收款',
                remark: this.paymentForm.remark
            };

            // 更新现金流
            this.systemData.cashFlow.balance += this.paymentForm.amount;
            this.systemData.cashFlow.records.push({
                id: `CF${Date.now()}`,
                date: paymentRecord.date,
                type: '收入',
                amount: this.paymentForm.amount,
                relatedId: paymentRecord.id,
                relatedType: '应收账款收款',
                remark: `收到客户付款：${this.getCustomerName(this.selectedCustomerId)}`
            });

            // 更新应收账款
            this.systemData.receivables.total -= this.paymentForm.amount;
            this.systemData.receivables.records.push(paymentRecord);

            this.$emit('data-change');
            this.paymentDialogVisible = false;
            this.$message.success('收款成功');
            this.calculateBill();
        },

        // 导出对账单
        exportBill() {
            if (!this.selectedCustomerId || !this.dateRange.length) {
                this.$message.warning('请先选择客户和日期范围');
                return;
            }

            const customer = this.systemData.customers.find(c => c.id === this.selectedCustomerId);
            const startDate = this.dateRange[0].toLocaleDateString();
            const endDate = this.dateRange[1].toLocaleDateString();

            // 生成CSV内容
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            csvContent += `客户对账单\n`;
            csvContent += `客户：${customer.name}\n`;
            csvContent += `对账期间：${startDate} 至 ${endDate}\n\n`;
            csvContent += `日期,单据编号,类型,金额,余额,备注\n`;

            this.billDetails.forEach(row => {
                csvContent += `${row.date},${row.documentNo},${row.type},${row.amount.toFixed(2)},${row.balance.toFixed(2)},"${row.remark || ''}"\n`;
            });

            csvContent += `\n汇总信息\n`;
            csvContent += `销售总额,¥${this.summary.totalSales.toFixed(2)}\n`;
            csvContent += `退货总额,¥${this.summary.totalReturn.toFixed(2)}\n`;
            csvContent += `已收金额,¥${this.summary.totalReceived.toFixed(2)}\n`;
            csvContent += `应收余额,¥${this.summary.balance.toFixed(2)}\n`;

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `客户对账单_${customer.name}_${startDate}-${endDate}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },

        // 获取客户名称
        getCustomerName(customerId) {
            const customer = this.systemData.customers.find(c => c.id === customerId);
            return customer ? customer.name : '未知客户';
        }
    }
}) 