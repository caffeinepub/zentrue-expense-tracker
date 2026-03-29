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

  type Amount = Float;
  type Date = Time.Time;
  type ExpenseId = Nat;
  type PaymentMode = { #cash; #upi; #bank };
  type Category = {
    #development; #marketing; #vendorCost;
    #salary; #officeExpense; #miscellaneous;
  };

  type ExpenseLegacy = {
    id : ExpenseId; date : Date; category : Category;
    amount : Amount; description : Text;
    paymentMode : PaymentMode; createdAt : Time.Time;
  };

  type Expense = {
    id : ExpenseId; date : Date; category : Category;
    amount : Amount; paidAmount : Amount; receiptUrl : ?Text;
    description : Text; paymentMode : PaymentMode; createdAt : Time.Time;
  };

  module Category {
    public func compare(a : Category, b : Category) : Order.Order {
      Text.compare(toText(a), toText(b));
    };
    public func toText(c : Category) : Text {
      switch c {
        case (#development) { "Development" };
        case (#marketing) { "Marketing" };
        case (#vendorCost) { "Vendor Cost" };
        case (#salary) { "Salary" };
        case (#officeExpense) { "Office Expense" };
        case (#miscellaneous) { "Miscellaneous" };
      };
    };
  };

  module Expense {
    public func compareByDate(a : Expense, b : Expense) : Order.Order {
      Int.compare(a.date, b.date);
    };
    public func compareByAmount(a : Expense, b : Expense) : Order.Order {
      Float.compare(a.amount, b.amount);
    };
    public func compareByCategory(a : Expense, b : Expense) : Order.Order {
      Category.compare(a.category, b.category);
    };
  };

  type ExpensePartial = {
    date : ?Date; category : ?Category; amount : ?Amount;
    paidAmount : ?Amount; receiptUrl : ?Text;
    description : ?Text; paymentMode : ?PaymentMode;
  };

  type CategorySummary = { category : Category; totalAmount : Amount };

  // Retained stable variables from previous version to preserve upgrade compatibility
  let dateApril15 = 1713188400000000000;
  let dateApril20 = 1713706800000000000;
  let dateApril22 = 1713886800000000000;

  let expenses = Map.empty<ExpenseId, ExpenseLegacy>();
  let expensesV2 = Map.empty<ExpenseId, Expense>();

  expensesV2.add(1, { id=1; date=dateApril15; category=#development; amount=1000.0; paidAmount=1000.0; receiptUrl=null; description="Consulting"; paymentMode=#cash; createdAt=dateApril15 });
  expensesV2.add(2, { id=2; date=dateApril20; category=#development; amount=2500.0; paidAmount=1500.0; receiptUrl=null; description="Product Design"; paymentMode=#upi; createdAt=dateApril20 });
  expensesV2.add(3, { id=3; date=dateApril22; category=#vendorCost; amount=500.0; paidAmount=0.0; receiptUrl=null; description="Miscellaneous"; paymentMode=#bank; createdAt=dateApril22 });

  var currentExpenseId = 4;

  system func postupgrade() {
    for (exp in expenses.values()) {
      if (not expensesV2.containsKey(exp.id)) {
        expensesV2.add(exp.id, {
          id=exp.id; date=exp.date; category=exp.category;
          amount=exp.amount; paidAmount=0.0; receiptUrl=null;
          description=exp.description; paymentMode=exp.paymentMode;
          createdAt=exp.createdAt;
        });
      };
    };
  };

  public shared func addExpense(date : Date, category : Category, amount : Amount, description : Text, paymentMode : PaymentMode, paidAmount : Amount, receiptUrl : ?Text) : async ExpenseId {
    let expenseId = currentExpenseId;
    expensesV2.add(expenseId, { id=expenseId; date; category; amount; paidAmount; receiptUrl; description; paymentMode; createdAt=Time.now() });
    currentExpenseId += 1;
    expenseId;
  };

  public shared func editExpense(id : ExpenseId, partial : ExpensePartial) : async Expense {
    switch (expensesV2.get(id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?e) {
        let updated = {
          id=e.id;
          date = switch (partial.date) { case null e.date; case (?v) v };
          category = switch (partial.category) { case null e.category; case (?v) v };
          amount = switch (partial.amount) { case null e.amount; case (?v) v };
          paidAmount = switch (partial.paidAmount) { case null e.paidAmount; case (?v) v };
          receiptUrl = switch (partial.receiptUrl) { case null e.receiptUrl; case (?v) ?v };
          description = switch (partial.description) { case null e.description; case (?v) v };
          paymentMode = switch (partial.paymentMode) { case null e.paymentMode; case (?v) v };
          createdAt=e.createdAt;
        };
        expensesV2.add(id, updated);
        updated;
      };
    };
  };

  public shared func deleteExpense(id : ExpenseId) : async () {
    if (not expensesV2.containsKey(id)) { Runtime.trap("Expense not found") };
    expensesV2.remove(id);
  };

  public query func getExpense(id : ExpenseId) : async Expense {
    switch (expensesV2.get(id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?e) e;
    };
  };

  public query func getAllExpenses() : async [Expense] {
    expensesV2.values().toArray().sort(Expense.compareByDate);
  };

  public query func getExpensesByCategory(category : Category) : async [Expense] {
    expensesV2.values().toArray().filter(func(e) { e.category == category }).sort(Expense.compareByDate);
  };

  public query func getExpensesByPaymentMode(paymentMode : PaymentMode) : async [Expense] {
    expensesV2.values().toArray().filter(func(e) { e.paymentMode == paymentMode }).sort(Expense.compareByDate);
  };

  public query func getExpensesByDateRange(startDate : Date, endDate : Date) : async [Expense] {
    expensesV2.values().toArray().filter(func(e) { e.date >= startDate and e.date <= endDate }).sort(Expense.compareByDate);
  };

  public query func getTotalAmount() : async Amount {
    expensesV2.values().toArray().foldLeft(0.0, func(total, e) { total + e.amount });
  };

  public query func getTotalPaidAmount() : async Amount {
    expensesV2.values().toArray().foldLeft(0.0, func(total, e) { total + e.paidAmount });
  };

  public query func getCategorySummary() : async [CategorySummary] {
    let summaries = List.empty<CategorySummary>();
    for (cat in [#development, #marketing, #vendorCost, #salary, #officeExpense, #miscellaneous].values()) {
      let total = expensesV2.values().toArray().filter(func(e) { e.category == cat }).foldLeft(0.0, func(t, e) { t + e.amount });
      summaries.add({ category=cat; totalAmount=total });
    };
    summaries.toArray();
  };
};
