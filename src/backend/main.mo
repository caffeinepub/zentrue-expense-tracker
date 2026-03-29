import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Int "mo:core/Int";
import List "mo:core/List";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Custom Types
  type Amount = Float;
  type Date = Time.Time;
  type ExpenseId = Nat;
  type PaymentMode = {
    #cash;
    #upi;
    #bank;
  };
  type Category = {
    #development;
    #marketing;
    #vendorCost;
    #salary;
    #officeExpense;
    #miscellaneous;
  };

  // Legacy Expense type (v1 — no paidAmount / receiptUrl)
  // Kept only so the stable variable `expenses` can be deserialized on upgrade.
  type ExpenseLegacy = {
    id : ExpenseId;
    date : Date;
    category : Category;
    amount : Amount;
    description : Text;
    paymentMode : PaymentMode;
    createdAt : Time.Time;
  };

  // Current Expense type (v2)
  type Expense = {
    id : ExpenseId;
    date : Date;
    category : Category;
    amount : Amount;
    paidAmount : Amount;
    receiptUrl : ?Text;
    description : Text;
    paymentMode : PaymentMode;
    createdAt : Time.Time;
  };

  // Persistence
  module Category {
    public func compare(category1 : Category, category2 : Category) : Order.Order {
      Text.compare(Category.toText(category1), Category.toText(category2));
    };

    public func fromText(categoryText : Text) : Category {
      switch (categoryText.toLower()) {
        case ("development") { #development };
        case ("marketing") { #marketing };
        case ("vendorcost") { #vendorCost };
        case ("salary") { #salary };
        case ("officeexpense") { #officeExpense };
        case ("miscellaneous") { #miscellaneous };
        case (_) { #miscellaneous };
      };
    };

    public func toText(category : Category) : Text {
      switch (category) {
        case (#development) { "Development" };
        case (#marketing) { "Marketing" };
        case (#vendorCost) { "Vendor Cost" };
        case (#salary) { "Salary" };
        case (#officeExpense) { "Office Expense" };
        case (#miscellaneous) { "Miscellaneous" };
      };
    };
  };

  module PaymentMode {
    public func fromText(paymentModeText : Text) : PaymentMode {
      switch (paymentModeText.toLower()) {
        case ("cash") { #cash };
        case ("upi") { #upi };
        case ("bank") { #bank };
        case (_) { #cash };
      };
    };

    public func toText(paymentMode : PaymentMode) : Text {
      switch (paymentMode) {
        case (#cash) { "Cash" };
        case (#upi) { "UPI" };
        case (#bank) { "Bank" };
      };
    };
  };

  // Legacy stable map — holds old data before migration (do not write new data here)
  let expenses = Map.empty<ExpenseId, ExpenseLegacy>();

  // Current stable map — all new and migrated expenses live here
  let expensesV2 = Map.empty<ExpenseId, Expense>();

  let dateApril15 = 1713188400000000000;
  let dateApril20 = 1713706800000000000;
  let dateApril22 = 1713886800000000000;

  // Seed data (only runs on first deploy, not on upgrade)
  expensesV2.add(1, {
    id = 1;
    date = dateApril15;
    category = #development;
    amount = 1000.0;
    paidAmount = 1000.0;
    receiptUrl = null;
    description = "Consulting";
    paymentMode = #cash;
    createdAt = 1713188400000000000;
  });
  expensesV2.add(2, {
    id = 2;
    date = dateApril20;
    category = #development;
    amount = 2500.0;
    paidAmount = 1500.0;
    receiptUrl = null;
    description = "Product Design";
    paymentMode = #upi;
    createdAt = 1713706800000000000;
  });
  expensesV2.add(3, {
    id = 3;
    date = dateApril22;
    category = #vendorCost;
    amount = 500.0;
    paidAmount = 0.0;
    receiptUrl = null;
    description = "Miscellaneous";
    paymentMode = #bank;
    createdAt = 1713886800000000000;
  });

  // Expense filtering
  module Expense {
    public func compare(expense1 : Expense, expense2 : Expense) : Order.Order {
      Nat.compare(expense1.id, expense2.id);
    };

    public func compareByAmount(expense1 : Expense, expense2 : Expense) : Order.Order {
      Float.compare(expense1.amount, expense2.amount);
    };

    public func compareByCategory(expense1 : Expense, expense2 : Expense) : Order.Order {
      Category.compare(expense1.category, expense2.category);
    };
    public func compareByDate(expense1 : Expense, expense2 : Expense) : Order.Order {
      Int.compare(expense1.date, expense2.date);
    };
  };

  // Expense merging
  type ExpensePartial = {
    date : ?Date;
    category : ?Category;
    amount : ?Amount;
    paidAmount : ?Amount;
    receiptUrl : ?Text;
    description : ?Text;
    paymentMode : ?PaymentMode;
  };

  // Category summary type
  type CategorySummary = {
    category : Category;
    totalAmount : Amount;
  };

  var currentExpenseId = 4;

  // Migration: on upgrade, copy legacy expenses into expensesV2 with default values
  system func postupgrade() {
    for (exp in expenses.values()) {
      if (not expensesV2.containsKey(exp.id)) {
        expensesV2.add(exp.id, {
          id = exp.id;
          date = exp.date;
          category = exp.category;
          amount = exp.amount;
          paidAmount = 0.0;
          receiptUrl = null;
          description = exp.description;
          paymentMode = exp.paymentMode;
          createdAt = exp.createdAt;
        });
      };
    };
  };

  public shared ({ caller }) func addExpense(date : Date, category : Category, amount : Amount, description : Text, paymentMode : PaymentMode, paidAmount : Amount, receiptUrl : ?Text) : async ExpenseId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add expenses");
    };
    let expenseId = currentExpenseId;
    let createdAt = Time.now();
    let expense : Expense = {
      id = expenseId;
      date;
      category;
      amount;
      paidAmount;
      receiptUrl;
      description;
      paymentMode;
      createdAt;
    };
    expensesV2.add(expenseId, expense);
    currentExpenseId += 1;
    expenseId;
  };

  public shared ({ caller }) func editExpense(id : ExpenseId, partial : ExpensePartial) : async Expense {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit expenses");
    };
    switch (expensesV2.get(id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?expense) {
        let updatedExpense = {
          id = expense.id;
          date = switch (partial.date) { case (null) { expense.date }; case (?date) { date } };
          category = switch (partial.category) {
            case (null) { expense.category };
            case (?category) { category };
          };
          amount = switch (partial.amount) {
            case (null) { expense.amount };
            case (?amount) { amount };
          };
          paidAmount = switch (partial.paidAmount) {
            case (null) { expense.paidAmount };
            case (?paidAmount) { paidAmount };
          };
          receiptUrl = switch (partial.receiptUrl) {
            case (null) { expense.receiptUrl };
            case (?url) { ?url };
          };
          description = switch (partial.description) {
            case (null) { expense.description };
            case (?description) { description };
          };
          paymentMode = switch (partial.paymentMode) {
            case (null) { expense.paymentMode };
            case (?paymentMode) { paymentMode };
          };
          createdAt = expense.createdAt;
        };
        expensesV2.add(id, updatedExpense);
        updatedExpense;
      };
    };
  };

  public shared ({ caller }) func deleteExpense(id : ExpenseId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete expenses");
    };
    if (not expensesV2.containsKey(id)) {
      Runtime.trap("Expense not found");
    };
    expensesV2.remove(id);
  };

  public query ({ caller }) func getExpense(id : ExpenseId) : async Expense {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    switch (expensesV2.get(id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?expense) { expense };
    };
  };

  public query ({ caller }) func getAllExpenses() : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    expensesV2.values().toArray().sort(Expense.compareByDate);
  };

  public query ({ caller }) func getExpensesByCategory(category : Category) : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    expensesV2.values().toArray().filter(func(expense) { expense.category == category }).sort(Expense.compareByDate);
  };

  public query ({ caller }) func getExpensesByPaymentMode(paymentMode : PaymentMode) : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    expensesV2.values().toArray().filter(func(expense) { expense.paymentMode == paymentMode }).sort(Expense.compareByDate);
  };

  public query ({ caller }) func getExpensesByDateRange(startDate : Date, endDate : Date) : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    expensesV2.values().toArray().filter(func(expense) { expense.date >= startDate and expense.date <= endDate }).sort(Expense.compareByDate);
  };

  public query ({ caller }) func getTotalAmount() : async Amount {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expense totals");
    };
    expensesV2.values().toArray().foldLeft(0.0, func(total, expense) { total + expense.amount });
  };

  public query ({ caller }) func getTotalPaidAmount() : async Amount {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expense totals");
    };
    expensesV2.values().toArray().foldLeft(0.0, func(total, expense) { total + expense.paidAmount });
  };

  public query ({ caller }) func getCategorySummary() : async [CategorySummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view category summaries");
    };
    let categorySummaries = List.empty<CategorySummary>();
    for (category in [ #development, #marketing, #vendorCost, #salary, #officeExpense, #miscellaneous ].values()) {
      let categoryExpenses = expensesV2.values().toArray().filter(func(expense) { expense.category == category });
      let totalAmount = categoryExpenses.foldLeft(0.0, func(total, expense) { total + expense.amount });
      let categorySummary : CategorySummary = {
        category;
        totalAmount;
      };
      categorySummaries.add(categorySummary);
    };
    categorySummaries.toArray();
  };
};
