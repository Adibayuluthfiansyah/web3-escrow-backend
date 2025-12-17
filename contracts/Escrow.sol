// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
//import "hardhat/console.sol";

contract Escrow {

    enum Status {
        AWAITING_PAYMENT,
        AWAITING_DELIVERY,
        IN_PROGRESS,
        COMPLETE,
        DISPUTED,
        REFUNDED,
        CANCELLED         
    }

    struct Deal {
        uint256 id;
        address buyer;
        address seller;
        address arbiter;
        uint256 amount;
        Status status;
        uint256 createdAt;
        uint256 deadline;
        string description;
    }

    // generate unik id 
    uint256 public dealCounter;
    mapping(uint256 => Deal) public deals;
    mapping(address => uint256[]) public buyerDeals;
    mapping(address => uint256[]) public sellerDeals;
    mapping(address => uint256[]) public arbiterDeals;

    event DealCreated (
        uint256 indexed DealId,
        address indexed buyer,
        address indexed seller,
        address arbiter,
        uint256 amount,
    );
    event DeliveryMarked(uint256 indexed DealId);
    event DeliveryConfirmed(uint256 indexed DealId);
    event DealRefunded(uint256 indexed DealId);
    event DealCancelled(uint256 indexed DealId);
    event DisputeResolved(uint256 indexed DealId, bool releaseToSeller);

    modifier onlyBuyer(uint256 _dealId) {
        require(msg.sender == deals[_dealId].buyer, "Only Buyer can call this method");
        _;
    }

    modifier onlySeller (uint256 _dealId) {
        require(msg.sender == deals[_dealId].seller, "Only Seller can call this method");
        _;
    }

    modifier onlyArbiter (uint256 _dealId) {
        require(msg.sender == deals[_dealId].arbiter, "Only Arbiter can call this method");
        _;
    }

    modifier inStatus (uint256 _dealId, Status expectedStatus) {
        require(deals[_dealId].status == expectedStatus, "Deal is not in required status");
        _;
    }
    
     // === Create new escrow deal === //
     function createDeal(
        address seller,
        address arbiter,
        uint256 durationInDays,
        string memory description
     ) external payable returns (uint256) {
        // Validation
        require(msg.value > 0, "Must send ETH to create deal");
        require(seller != address(0), "Invalid Seller")
        require(arbiter != address(0), "Invalid Arbiter");
        require(seller != msg.sender, "Seller Cannot Be Buyer");
        require(arbiter != msg.sender && arbiter != seller, "Invalid Arbiter");
        require(durationInDays > 0 && durationInDays <= 365, "Invalid Duration");

        // Create deals
        uint256 dealId = dealCounter++;
        deals[dealId] = Deal ({
            id: dealId,
            buyer: msg.sender,
            seller: seller,
            arbiter: arbiter,
            amount: msg.value,
            status: Status.AWAITING_DELIVERY,
            createdAt: block.timestamp,
            deadline: block.timestamp + (durationInDays * 1 days),
            description: description
        });

         // Track deals 
         buyerDeals[msg.sender].push(dealId);
         sellerDeals[seller].push(dealId);
         arbiterDeals[arbiter].push(dealId);
         emit DealCreated(dealId, msg.sender, seller, arbiter, msg.value);
         return dealId;
     }
}


