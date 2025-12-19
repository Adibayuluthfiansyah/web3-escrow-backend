import { expect } from "chai";
import { ethers } from "hardhat";
import { Escrow } from "../typechain-types";
import { resolve } from "node:dns";

describe("Escrow Contract", function () {
    async function deployEscrowFixture() {
        const [buyer, seller, arbiter] = await ethers.getSigners();
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        return { escrow, buyer, seller, arbiter };
    }
    it("Should make a deal, mark delivery, and finish payment (NORMAL FLOW)", async function () {
        const {escrow,buyer,seller,arbiter} = await deployEscrowFixture();
        const amount = ethers.parseEther("1.0");
        const lockTime = 30;

        // make a deal
        await escrow.connect(buyer).createDeal(seller.address, arbiter.address, lockTime, "Token 70NG",{value: amount});
        const dealId = 0;

        // seller marks delivery (IN_PROGRESS)
        await expect(escrow.connect(seller).markDelivery(dealId))
            .to.emit(escrow, "DeliveryMarked");

        // buyer confirms and finishes payment
        await expect(() => escrow.connect(buyer).confirmDelivery(dealId))
            .to.changeEtherBalances([escrow, seller], [ -amount, amount ]);
    });

    //dispute flow and refund flow tests 
    describe("Escrow Contract - Edge Cases", function () {
        it("Arbiter should win buyer (AMOUNT REFUND BACK TO BUYER)", async function() {
            const {escrow,buyer,seller,arbiter} = await deployEscrowFixture();
            const amount = ethers.parseEther("2.0");
            const lockTime = 7;

            // make a deal
            await escrow.connect(buyer).createDeal(seller.address, arbiter.address, lockTime, "Macbook" , {value:amount})
            const dealId = 0;

            // dispute raised buyer request refund
            await expect(escrow.connect(buyer).raiseDispute(dealId))
                .to.emit(escrow, "DisputeRaised");

            // arbiter resolves dispute wins buyer and ETH refunded to buyer
            await expect(escrow.connect(arbiter).resolveDispute(dealId, false))
                .to.emit(escrow, "DisputeResolved")
                .withArgs(dealId, false);

                const dealInfo = await escrow.deals(dealId);
                expect(dealInfo.status).to.equal(5); // RESOLVED 
        });

        it("Should allow refund if deadline is not passed", async function (){
            const {escrow,buyer,seller,arbiter} = await deployEscrowFixture();
            const amount = ethers.parseEther("1.0");
            const lockTime = 30;

            await escrow.connect(buyer).createDeal(seller.address, arbiter.address, lockTime, "Refund Fail Test" , {value:amount})

            // go refund before deadline
            await expect(escrow.connect(buyer).requestRefund(0))
            .to.be.revertedWith("Deadline not reached");

        });

        it("Arbiter should win seller (AMOUNT PAID TO SELLER)", async function() {
            const {escrow,buyer,seller,arbiter} = await deployEscrowFixture();
            const amount = ethers.parseEther("3.0");

            // make a deal
            await escrow.connect(buyer).createDeal(seller.address, arbiter.address, 3, "iPhone" , {value:amount})
            const dealId = 0;

            await escrow.connect(seller).raiseDispute(dealId);
            
            // arbiter resolves dispute wins seller and ETH paid to seller
            await expect(() => 
            escrow.connect(arbiter).resolveDispute(dealId, true)
            ).to.changeEtherBalances([escrow, seller], [-amount, amount]);

            const dealInfo = await escrow.deals(dealId);
            expect(dealInfo.status).to.equal(3); // RESOLVED
        });
    });
});

