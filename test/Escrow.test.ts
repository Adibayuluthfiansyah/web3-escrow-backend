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

            // make a deal
            await escrow.connect(buyer).createDeal(seller.address, arbiter.address, 7, "Macbook" , {value:amount})
            const dealId = 0;

            // dispute raised buyer request refund
            await expect(escrow.connect(buyer).raiseDispute(dealId))
                .to.emit(escrow, "DisputeRaised");

            // arbiter resolves dispute wins buyer and ETH refunded to buyer
            await expect(escrow.connect(arbiter).resolveDispute(dealId, false))
                .to.emit(escrow, "DisputeResolved")
                .withArgs(dealId, false)
                .and.to.changeEtherBalances([escrow, buyer], [ -amount, amount ]);
        });
        it("Arbiter should win seller (AMOUNT PAID TO SELLER)", async function() {
            const {escrow,buyer,seller,arbiter} = await deployEscrowFixture();
            const amount = ethers.parseEther("3.0");

            // make a deal
            await escrow.connect(buyer).createDeal(seller.address, arbiter.address, 3, "iPhone" , {value:amount})
            const dealId = 0;

            // dispute raised seller request refund
            await expect(escrow.connect(seller).raiseDispute(dealId))
                .to.emit(escrow, "DisputeRaised");

            // arbiter resolves dispute wins seller and ETH paid to seller
            await expect(escrow.connect(arbiter).resolveDispute(dealId, true))
                .to.emit(escrow, "DisputeResolved")
                .withArgs(dealId, true)
                .and.to.changeEtherBalances([escrow, seller], [ -amount, amount ]);
        });
    });
});

