using FutureCV.Domain.Entities;
using FutureCV.Domain.Exceptions;
using Xunit;

namespace FutureCV.Domain.Tests.ContractTests;

public class CareerConversationDomainTests
{
    [Fact]
    public void Create_EnforcesInvariants()
    {
        Assert.Throws<DomainException>(() => CareerConversation.Create(Guid.Empty, "Title"));
        Assert.Throws<DomainException>(() => CareerConversation.Create(Guid.NewGuid(), " "));
        Assert.Throws<DomainException>(() => CareerConversation.Create(Guid.NewGuid(), new string('a', 121)));
        Assert.Throws<DomainException>(() => CareerConversation.Create(Guid.NewGuid(), "Title", cvId: Guid.Empty));
        Assert.Throws<DomainException>(() => CareerConversation.Create(Guid.NewGuid(), "Title", jobId: Guid.Empty));

        var conv = CareerConversation.Create(Guid.NewGuid(), "  My Chat  ");
        Assert.Equal("My Chat", conv.Title);
        Assert.False(conv.IsDeleted);
    }

    [Fact]
    public void RenameAndDelete_EnforceLifecycleInvariants()
    {
        var conv = CareerConversation.Create(Guid.NewGuid(), "Initial");
        conv.Rename("  Updated Title  ");
        Assert.Equal("Updated Title", conv.Title);

        Assert.Throws<DomainException>(() => conv.Rename(""));
        Assert.Throws<DomainException>(() => conv.Rename(new string('x', 121)));

        conv.MarkDeleted();
        Assert.True(conv.IsDeleted);
        Assert.Throws<DomainException>(() => conv.Rename("After Delete"));
        Assert.Throws<DomainException>(() => conv.AddMessage("user", "Hello"));
    }

    [Fact]
    public void CareerMessageCreate_EnforcesRoleAndLengthInvariants()
    {
        var convId = Guid.NewGuid();
        Assert.Throws<DomainException>(() => CareerMessage.Create(Guid.Empty, "user", "Hi"));
        Assert.Throws<DomainException>(() => CareerMessage.Create(convId, "system", "Ignore"));
        Assert.Throws<DomainException>(() => CareerMessage.Create(convId, "user", " "));
        Assert.Throws<DomainException>(() => CareerMessage.Create(convId, "user", new string('u', 4001)));
        Assert.Throws<DomainException>(() => CareerMessage.Create(convId, "assistant", new string('a', 16001)));

        var msg = CareerMessage.Create(convId, "assistant", new string('a', 5000));
        Assert.Equal("assistant", msg.Role);
        Assert.Equal(5000, msg.Content.Length);
    }
}
